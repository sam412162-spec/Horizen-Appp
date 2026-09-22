import { and, asc, desc, eq, inArray, lte, ne, sql } from 'drizzle-orm';

import type { Ctx } from '../context.js';
import type { Db } from '../db/client.js';
import { invoices, memberships, members, paymentMethods, payments, plans } from '../db/schema.js';
import { randomToken } from '../lib/crypto.js';
import { ApiError, badRequest, notFound } from '../lib/errors.js';
import { addDaysKey, addIntervalKey, maxKey } from '../lib/time.js';
import type { PaystackTransaction } from '../paystack.js';
import { getMembershipRow, todayKey, type MemberRow } from './members.js';

type PlanRow = typeof plans.$inferSelect;
type InvoiceRow = typeof invoices.$inferSelect;
type PaymentRow = typeof payments.$inferSelect;

/** Renewal invoices are created this many days before a membership runs out. */
export const RENEWAL_LEAD_DAYS = 3;
/** Automatic card charges per invoice, at most one attempt per this many hours. */
export const MAX_AUTO_CHARGE_ATTEMPTS = 3;
export const AUTO_CHARGE_RETRY_HOURS = 72;

const money = (amount: number, currency: string) => ({ amount, currency });

export function planDto(p: PlanRow) {
  return { id: p.id, name: p.name, price: money(p.priceCents, p.currency), interval: p.interval, perks: p.perks };
}

function invoiceDto(ctx: Ctx, i: InvoiceRow) {
  const status = i.status === 'due' && i.dueAt < todayKey(ctx) ? 'overdue' : i.status;
  return {
    id: i.id,
    description: i.description,
    amount: money(i.amountCents, i.currency),
    issuedAt: i.issuedAt,
    dueAt: i.dueAt,
    status,
    paidAt: i.paidAt?.toISOString(),
  };
}

async function nextInvoiceNumber(db: Db) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(invoices);
  return `INV-${String(n + 1).padStart(6, '0')}`;
}

export async function listPlans(ctx: Ctx) {
  const rows = await ctx.db.select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.sortOrder));
  return rows.map(planDto);
}

export async function listInvoices(ctx: Ctx, memberId: string) {
  const rows = await ctx.db
    .select()
    .from(invoices)
    .where(and(eq(invoices.memberId, memberId), ne(invoices.status, 'void')))
    .orderBy(desc(invoices.issuedAt), desc(invoices.createdAt));
  return rows.map((i) => invoiceDto(ctx, i));
}

async function defaultCard(db: Db, memberId: string) {
  const [pm] = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.memberId, memberId), eq(paymentMethods.isDefault, true)));
  return pm ?? null;
}

export async function billingSummary(ctx: Ctx, memberId: string) {
  const row = await getMembershipRow(ctx, memberId);
  if (!row) throw notFound('No membership found.');
  const unpaid = await ctx.db
    .select({ total: sql<number>`coalesce(sum(${invoices.amountCents}), 0)::int` })
    .from(invoices)
    .where(and(eq(invoices.memberId, memberId), inArray(invoices.status, ['due', 'failed'])));
  const pm = await defaultCard(ctx.db, memberId);
  return {
    plan: planDto(row.plan),
    nextPaymentAt: row.membership.autoRenew ? addDaysKey(row.membership.validUntil, 1) : undefined,
    balance: money(unpaid[0].total, row.plan.currency),
    paymentMethod: pm ? { type: pm.type, label: pm.label } : undefined,
  };
}

// ─── Checkout (member pays on Paystack's hosted page) ───────────────────────

export type CheckoutRequest =
  | { kind: 'invoice'; invoiceId: string; returnUrl?: string }
  | { kind: 'plan'; planId: string; returnUrl?: string };

export async function startCheckout(ctx: Ctx, member: MemberRow, req: CheckoutRequest) {
  if (req.returnUrl && !ctx.config.allowedReturnUrlPrefixes.some((p) => req.returnUrl!.startsWith(p))) {
    throw badRequest('Invalid return URL.');
  }

  let amountCents: number;
  let currency: string;
  let invoiceId: string | null = null;
  let planId: string | null = null;

  if (req.kind === 'invoice') {
    const [inv] = await ctx.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, req.invoiceId), eq(invoices.memberId, member.id)));
    if (!inv) throw notFound('Invoice not found.');
    if (inv.status === 'paid' || inv.status === 'void') throw new ApiError(409, 'already_paid', 'This invoice is already paid.');
    amountCents = inv.amountCents;
    currency = inv.currency;
    invoiceId = inv.id;
  } else {
    const [plan] = await ctx.db.select().from(plans).where(and(eq(plans.id, req.planId), eq(plans.active, true)));
    if (!plan) throw notFound('Plan not found.');
    amountCents = plan.priceCents;
    currency = plan.currency;
    planId = plan.id;
  }

  const reference = `hz_${randomToken(12)}`;
  const [payment] = await ctx.db
    .insert(payments)
    .values({
      memberId: member.id,
      reference,
      kind: req.kind,
      invoiceId,
      planId,
      amountCents,
      currency,
      returnUrl: req.returnUrl,
      createdAt: ctx.now(),
    })
    .returning();

  const { authorizationUrl } = await ctx.paystack.initializeTransaction({
    email: member.email,
    amount: amountCents,
    currency,
    reference,
    callbackUrl: `${ctx.config.publicUrl}/payments/return?reference=${encodeURIComponent(reference)}`,
    metadata: { paymentId: payment.id, memberId: member.id, kind: req.kind },
  });
  await ctx.db.update(payments).set({ checkoutUrl: authorizationUrl }).where(eq(payments.id, payment.id));
  return { id: payment.id, url: authorizationUrl };
}

/**
 * Called by the app after the checkout page closes. Webhooks normally settle
 * the payment first; if not, we ask Paystack directly.
 */
export async function checkoutResult(ctx: Ctx, memberId: string, paymentId: string) {
  const [payment] = await ctx.db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.memberId, memberId)));
  if (!payment) throw notFound('Payment not found.');
  if (payment.status !== 'pending') return payment.status;

  let tx: PaystackTransaction;
  try {
    tx = await ctx.paystack.verifyTransaction(payment.reference);
  } catch {
    return 'pending';
  }
  const status = await settlePayment(ctx, payment.reference, tx);
  // "abandoned" = the member closed the page. Keep the payment open in case they
  // finish later, but tell the app it was cancelled.
  if (status === 'pending' && tx.status === 'abandoned') return 'cancelled';
  return status;
}

/** The HTML page Paystack redirects to after checkout; bounces the member back into the app. */
export async function returnPage(ctx: Ctx, reference: string) {
  const [payment] = await ctx.db.select().from(payments).where(eq(payments.reference, reference));
  const target = payment?.returnUrl
    ? `${payment.returnUrl}${payment.returnUrl.includes('?') ? '&' : '?'}reference=${encodeURIComponent(reference)}`
    : null;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Horizen Gym</title>${target ? `<meta http-equiv="refresh" content="0;url=${esc(target)}">` : ''}
<style>body{font-family:system-ui,sans-serif;background:#F7EAE8;color:#17120F;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center;padding:24px}a{color:#17120F;font-weight:700}</style>
</head><body><div><h2>Payment complete</h2><p>${target ? `<a href="${esc(target)}">Return to the Horizen app</a>` : 'You can close this page and return to the Horizen app.'}</p></div></body></html>`;
}

// ─── Settlement ─────────────────────────────────────────────────────────────

/**
 * Apply a Paystack transaction outcome to our records. Idempotent: webhooks,
 * the app's status check and the billing job may all call this for the same
 * reference.
 */
export async function settlePayment(
  ctx: Ctx,
  reference: string,
  tx: PaystackTransaction,
): Promise<PaymentRow['status']> {
  return ctx.db.transaction(async (db) => {
    const [payment] = await db.select().from(payments).where(eq(payments.reference, reference)).for('update');
    if (!payment) return 'failed';
    if (payment.status !== 'pending') return payment.status;

    const failed = async (reason: string) => {
      await db
        .update(payments)
        .set({ status: 'failed', failureReason: reason, settledAt: ctx.now() })
        .where(eq(payments.id, payment.id));
      if (payment.kind === 'renewal' && payment.invoiceId) {
        await db.update(invoices).set({ status: 'failed' }).where(eq(invoices.id, payment.invoiceId));
      }
      return 'failed' as const;
    };

    if (tx.status === 'failed' || tx.status === 'reversed') return failed(tx.gateway_response ?? tx.status);
    if (tx.status !== 'success') return 'pending';
    if (tx.amount < payment.amountCents || tx.currency !== payment.currency) {
      return failed(`Amount mismatch: got ${tx.amount} ${tx.currency}`);
    }

    await db.update(payments).set({ status: 'paid', settledAt: ctx.now() }).where(eq(payments.id, payment.id));
    const today = todayKey(ctx);
    const [ms] = await db.select().from(memberships).where(eq(memberships.memberId, payment.memberId));

    if (payment.invoiceId) {
      const [inv] = await db
        .update(invoices)
        .set({ status: 'paid', paidAt: ctx.now() })
        .where(eq(invoices.id, payment.invoiceId))
        .returning();
      if (inv?.periodEnd && ms) {
        await db
          .update(memberships)
          .set({ validUntil: maxKey(ms.validUntil, inv.periodEnd) })
          .where(eq(memberships.id, ms.id));
      }
    } else if (payment.planId) {
      // Plan purchase / switch: switches now and adds one full period after any
      // time the member has already paid for.
      const [plan] = await db.select().from(plans).where(eq(plans.id, payment.planId));
      const start = ms && ms.validUntil >= today ? addDaysKey(ms.validUntil, 1) : today;
      const periodEnd = addDaysKey(addIntervalKey(start, plan.interval), -1);
      if (ms) {
        await db.update(memberships).set({ planId: plan.id, validUntil: periodEnd }).where(eq(memberships.id, ms.id));
      } else {
        await db.insert(memberships).values({ memberId: payment.memberId, planId: plan.id, validUntil: periodEnd });
      }
      await db.insert(invoices).values({
        number: await nextInvoiceNumber(db),
        memberId: payment.memberId,
        description: plan.name,
        amountCents: payment.amountCents,
        currency: payment.currency,
        planId: plan.id,
        periodEnd,
        issuedAt: today,
        dueAt: today,
        status: 'paid',
        paidAt: ctx.now(),
      });
    }

    await saveCard(db, payment.memberId, tx);
    return 'paid' as const;
  });
}

/** Remember a reusable card so renewals can be charged automatically. */
async function saveCard(db: Db, memberId: string, tx: PaystackTransaction) {
  const auth = tx.authorization;
  if (tx.customer?.customer_code) {
    await db
      .update(members)
      .set({ paystackCustomerCode: tx.customer.customer_code })
      .where(eq(members.id, memberId));
  }
  if (!auth?.authorization_code || !auth.reusable || (auth.channel && auth.channel !== 'card')) return;
  const brand = (auth.card_type ?? 'Card').trim();
  const label = `${brand.charAt(0).toUpperCase()}${brand.slice(1)} •••• ${auth.last4 ?? '????'}`;
  await db.update(paymentMethods).set({ isDefault: false }).where(eq(paymentMethods.memberId, memberId));
  const [existing] = auth.signature
    ? await db
        .select()
        .from(paymentMethods)
        .where(and(eq(paymentMethods.memberId, memberId), eq(paymentMethods.signature, auth.signature)))
    : [];
  if (existing) {
    await db
      .update(paymentMethods)
      .set({ authorizationCode: auth.authorization_code, label, isDefault: true, reusable: true })
      .where(eq(paymentMethods.id, existing.id));
  } else {
    await db.insert(paymentMethods).values({
      memberId,
      type: 'card',
      label,
      authorizationCode: auth.authorization_code,
      signature: auth.signature,
      reusable: true,
      isDefault: true,
    });
  }
}

// ─── Billing job ────────────────────────────────────────────────────────────

/**
 * 1. Issue renewal invoices for memberships ending within RENEWAL_LEAD_DAYS.
 * 2. Charge saved cards for renewal invoices that are due.
 * Unpaid invoices stay "due"/"failed" and the member can pay in the app;
 * the membership simply lapses once validUntil passes.
 */
export async function runBilling(ctx: Ctx) {
  const today = todayKey(ctx);
  const summary = { invoicesCreated: 0, chargesAttempted: 0, chargesPaid: 0 };

  const renewing = await ctx.db
    .select({ membership: memberships, plan: plans })
    .from(memberships)
    .innerJoin(plans, eq(plans.id, memberships.planId))
    .where(
      and(
        eq(memberships.autoRenew, true),
        eq(memberships.frozen, false),
        lte(memberships.validUntil, addDaysKey(today, RENEWAL_LEAD_DAYS)),
        // Don't chase memberships that lapsed long ago — staff handle those.
        sql`${memberships.validUntil} >= ${addDaysKey(today, -30)}`,
      ),
    );

  for (const { membership, plan } of renewing) {
    const start = addDaysKey(membership.validUntil, 1);
    const periodEnd = addDaysKey(addIntervalKey(start, plan.interval), -1);
    const [existing] = await ctx.db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.memberId, membership.memberId),
          eq(invoices.periodEnd, periodEnd),
          ne(invoices.status, 'void'),
        ),
      );
    if (existing) continue;
    await ctx.db.insert(invoices).values({
      number: await nextInvoiceNumber(ctx.db),
      memberId: membership.memberId,
      description: plan.name,
      amountCents: plan.priceCents,
      currency: plan.currency,
      planId: plan.id,
      periodEnd,
      issuedAt: today,
      dueAt: start,
      status: 'due',
    });
    summary.invoicesCreated++;
  }

  const dueNow = await ctx.db
    .select({ invoice: invoices, member: members })
    .from(invoices)
    .innerJoin(members, eq(members.id, invoices.memberId))
    .where(and(inArray(invoices.status, ['due', 'failed']), lte(invoices.dueAt, today), sql`${invoices.planId} is not null`));

  for (const { invoice, member } of dueNow) {
    const card = await defaultCard(ctx.db, member.id);
    if (!card?.reusable) continue;
    const attempts = await ctx.db
      .select()
      .from(payments)
      .where(and(eq(payments.invoiceId, invoice.id), eq(payments.kind, 'renewal')))
      .orderBy(desc(payments.createdAt));
    if (attempts.length >= MAX_AUTO_CHARGE_ATTEMPTS) continue;
    if (attempts.some((a) => a.status === 'pending')) continue;
    const last = attempts[0];
    if (last && ctx.now().getTime() - last.createdAt.getTime() < AUTO_CHARGE_RETRY_HOURS * 3_600_000) continue;

    const reference = `hz_${randomToken(12)}`;
    await ctx.db.insert(payments).values({
      memberId: member.id,
      reference,
      kind: 'renewal',
      invoiceId: invoice.id,
      amountCents: invoice.amountCents,
      currency: invoice.currency,
      paymentMethodId: card.id,
      createdAt: ctx.now(),
    });
    summary.chargesAttempted++;
    try {
      const tx = await ctx.paystack.chargeAuthorization({
        authorizationCode: card.authorizationCode,
        email: member.email,
        amount: invoice.amountCents,
        currency: invoice.currency,
        reference,
        metadata: { invoiceId: invoice.id, memberId: member.id, kind: 'renewal' },
      });
      if ((await settlePayment(ctx, reference, tx)) === 'paid') summary.chargesPaid++;
    } catch (e) {
      await settlePayment(ctx, reference, {
        reference,
        status: 'failed',
        amount: 0,
        currency: invoice.currency,
        gateway_response: e instanceof Error ? e.message : 'charge failed',
      });
    }
  }
  return summary;
}
