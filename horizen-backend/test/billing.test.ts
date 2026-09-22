import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { invoices, memberships, paymentMethods, payments } from '../src/db/schema.js';
import { runBilling } from '../src/services/billing.js';
import { setup, type TestEnv } from './helpers.js';

let env: TestEnv;
let token: string;

beforeAll(async () => {
  env = await setup();
  token = await env.login();
});
afterAll(() => env.close());

const membership = async () => (await env.ctx.db.select().from(memberships))[0];

describe('checkout via Paystack', () => {
  it('rejects return URLs outside the app', async () => {
    const res = await env.call('POST', '/me/checkout', {
      token,
      body: { kind: 'plan', planId: 'premium-annual', returnUrl: 'https://evil.example' },
    });
    expect(res.status).toBe(400);
  });

  let paymentId: string;
  let reference: string;

  it('creates a hosted checkout for a plan', async () => {
    const res = await env.call('POST', '/me/checkout', {
      token,
      body: { kind: 'plan', planId: 'premium-annual', returnUrl: 'exp://192.168.1.5:8081/--/payment-complete' },
    });
    expect(res.status).toBe(200);
    expect(res.json.url).toMatch(/^https:\/\/checkout\.paystack\.test\//);
    paymentId = res.json.id;
    const init = env.paystack.calls.find((c) => c.method === 'initialize')!.args as any;
    expect(init).toMatchObject({ email: 'sam@example.com', amount: 650000, currency: 'ZAR' });
    expect(init.callbackUrl).toMatch(/^https:\/\/api\.test\/payments\/return\?reference=hz_/);
    reference = init.reference;
  });

  it('reports "cancelled" while the member has not paid', async () => {
    const res = await env.call('GET', `/me/checkout/${paymentId}`, { token });
    expect(res.json.result).toBe('cancelled');
  });

  it('rejects webhooks with a bad signature', async () => {
    const tx = env.paystack.complete(reference);
    expect(await env.webhook('charge.success', tx, 'wrong-secret')).toBe(401);
    expect((await env.call('GET', `/me/checkout/${paymentId}`, { token })).json.result).toBe('paid'); // verified with Paystack instead
  });

  it('applies the plan once, even if the webhook is replayed', async () => {
    const tx = env.paystack.transactions.get(reference)!;
    expect(await env.webhook('charge.success', tx)).toBe(200);
    expect(await env.webhook('charge.success', tx)).toBe(200);

    const ms = await membership();
    expect(ms.planId).toBe('premium-annual');
    // Paid through 2026-10-12 already, so the year is added after that.
    expect(ms.validUntil).toBe('2027-10-12');
    const inv = await env.call('GET', '/me/invoices', { token });
    expect(inv.json).toHaveLength(1);
    expect(inv.json[0]).toMatchObject({ status: 'paid', amount: { amount: 650000, currency: 'ZAR' } });

    const billing = await env.call('GET', '/me/billing', { token });
    expect(billing.json.paymentMethod).toEqual({ type: 'card', label: 'Visa •••• 4081' });
    expect(billing.json.plan.id).toBe('premium-annual');
  });

  it('serves a return page that sends the member back into the app', async () => {
    const res = await env.app.request(`/payments/return?reference=${reference}`);
    const html = await res.text();
    expect(html).toContain('exp://192.168.1.5:8081/--/payment-complete?reference=');
  });

  it('fails a payment whose amount does not match', async () => {
    const res = await env.call('POST', '/me/checkout', { token, body: { kind: 'plan', planId: 'basic-monthly' } });
    const ref = (env.paystack.calls.at(-1)!.args as any).reference;
    const tx = { ...env.paystack.complete(ref), amount: 100 };
    await env.webhook('charge.success', tx);
    expect((await env.call('GET', `/me/checkout/${res.json.id}`, { token })).json.result).toBe('failed');
    expect((await membership()).planId).toBe('premium-annual');
  });
});

describe('billing job (renewals)', () => {
  it('invoices before expiry and charges the saved card on the due date', async () => {
    await env.ctx.db.update(memberships).set({ planId: 'premium-monthly', validUntil: '2026-09-24' });
    const first = await runBilling(env.ctx);
    expect(first.invoicesCreated).toBe(1);
    expect(first.chargesAttempted).toBe(0); // not due until 2026-09-25

    const due = await env.call('GET', '/me/billing', { token });
    expect(due.json.balance.amount).toBe(65000);

    env.clock.now = new Date('2026-09-25T06:00:00Z');
    const second = await runBilling(env.ctx);
    expect(second).toMatchObject({ invoicesCreated: 0, chargesAttempted: 1, chargesPaid: 1 });
    expect((await membership()).validUntil).toBe('2026-10-24');
    expect((await env.call('GET', '/me/billing', { token })).json.balance.amount).toBe(0);

    // Running again does nothing new.
    expect(await runBilling(env.ctx)).toMatchObject({ invoicesCreated: 0, chargesAttempted: 0 });
  });

  it('marks a declined renewal as failed, lets the member pay in the app, and limits retries', async () => {
    env.paystack.setChargeOutcome('failed');
    await env.ctx.db.update(memberships).set({ validUntil: '2026-09-25' }); // due tomorrow
    env.clock.now = new Date('2026-09-26T06:00:00Z');
    const run = await runBilling(env.ctx);
    expect(run).toMatchObject({ invoicesCreated: 1, chargesAttempted: 1, chargesPaid: 0 });

    const list = await env.call('GET', '/me/invoices', { token });
    const failedInv = list.json.find((i: any) => i.status === 'failed');
    expect(failedInv).toBeTruthy();

    // Retry waits 72 hours.
    env.clock.now = new Date('2026-09-27T06:00:00Z');
    expect((await runBilling(env.ctx)).chargesAttempted).toBe(0);

    // Member pays it in the app instead.
    const co = await env.call('POST', '/me/checkout', { token, body: { kind: 'invoice', invoiceId: failedInv.id } });
    const ref = (env.paystack.calls.at(-1)!.args as any).reference;
    await env.webhook('charge.success', env.paystack.complete(ref));
    expect((await env.call('GET', `/me/checkout/${co.json.id}`, { token })).json.result).toBe('paid');
    const [inv] = await env.ctx.db.select().from(invoices).where(eq(invoices.id, failedInv.id));
    expect(inv.status).toBe('paid');
    expect((await membership()).validUntil).toBe(inv.periodEnd);

    const renewalAttempts = await env.ctx.db.select().from(payments).where(eq(payments.kind, 'renewal'));
    expect(renewalAttempts.filter((p) => p.status === 'failed')).toHaveLength(1);
    expect(await env.ctx.db.select().from(paymentMethods)).toHaveLength(1); // same card not duplicated
  });
});

describe('Paystack outages', () => {
  it('returns a member-friendly error when Paystack is unavailable', async () => {
    const { PaystackError } = await import('../src/paystack.js');
    const original = env.ctx.paystack.initializeTransaction;
    env.ctx.paystack.initializeTransaction = async () => {
      throw new PaystackError('PAYSTACK_SECRET_KEY is not set.');
    };
    const res = await env.call('POST', '/me/checkout', { token, body: { kind: 'plan', planId: 'basic-monthly' } });
    env.ctx.paystack.initializeTransaction = original;
    expect(res.status).toBe(502);
    expect(res.json.error).toEqual({
      code: 'payment_unavailable',
      message: 'Payments are unavailable right now. Please try again later.',
    });
  });
});
