import { desc, eq } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { z, ZodError } from 'zod';

import type { Ctx } from './context.js';
import { members, workoutPrograms, workouts } from './db/schema.js';
import { ApiError, badRequest, notFound } from './lib/errors.js';
import { PaystackError, verifyWebhookSignature, type PaystackTransaction } from './paystack.js';
import * as billing from './services/billing.js';
import * as checkin from './services/checkin.js';
import * as classes from './services/classes.js';
import * as membersSvc from './services/members.js';
import { mediaUrl, type MemberRow } from './services/members.js';
import * as progress from './services/progress.js';

type Env = { Variables: { member: MemberRow; token: string } };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function createApp(ctx: Ctx) {
  const app = new Hono<Env>();

  if (ctx.config.corsOrigins.length) app.use('*', cors({ origin: ctx.config.corsOrigins }));

  app.onError((err, c) => {
    if (err instanceof ApiError) return c.json({ error: { code: err.code, message: err.message } }, err.status);
    if (err instanceof ZodError) {
      return c.json({ error: { code: 'bad_request', message: err.issues[0]?.message ?? 'Invalid request.' } }, 400);
    }
    if (err instanceof PaystackError) {
      console.error('[paystack]', err.message);
      return c.json(
        { error: { code: 'payment_unavailable', message: 'Payments are unavailable right now. Please try again later.' } },
        502,
      );
    }
    console.error(err);
    return c.json({ error: { code: 'server_error', message: 'Something went wrong. Please try again.' } }, 500);
  });
  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Not found.' } }, 404));

  app.get('/health', (c) => c.json({ ok: true }));

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const loginAttempts = new Map<string, { count: number; resetAt: number }>();

  app.post('/auth/login', async (c) => {
    const body = z
      .object({ email: z.string().email('Please enter a valid email.'), password: z.string().min(1) })
      .parse(await c.req.json());
    // Simple brute-force protection: 10 attempts per email per 15 minutes.
    const key = body.email.toLowerCase();
    const now = ctx.now().getTime();
    const rec = loginAttempts.get(key);
    if (rec && rec.resetAt > now && rec.count >= 10) {
      throw new ApiError(429, 'too_many_attempts', 'Too many attempts. Please wait a few minutes and try again.');
    }
    try {
      const { token, member } = await membersSvc.login(ctx, body.email, body.password);
      loginAttempts.delete(key);
      return c.json({ token, member: membersSvc.memberDto(ctx, member) });
    } catch (e) {
      const cur = rec && rec.resetAt > now ? rec : { count: 0, resetAt: now + 15 * 60_000 };
      loginAttempts.set(key, { ...cur, count: cur.count + 1 });
      throw e;
    }
  });

  app.post('/auth/google', () => {
    throw new ApiError(501, 'not_implemented', 'Google sign-in is not available yet. Please use email and password.');
  });

  // Everything below needs a signed-in member.
  const requireMember = async (c: Context<Env>, next: () => Promise<void>) => {
    const header = c.req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const member = token ? await membersSvc.memberForToken(ctx, token) : null;
    if (!member) throw new ApiError(401, 'unauthorized', 'Please sign in again.');
    c.set('member', member);
    c.set('token', token);
    await next();
  };
  app.use('/me', requireMember);
  app.use('/me/*', requireMember);
  app.use('/auth/logout', requireMember);
  app.use('/classes/*', requireMember);
  app.use('/classes', requireMember);
  app.use('/workouts', requireMember);

  app.post('/auth/logout', async (c) => {
    await membersSvc.revokeSession(ctx, c.get('token'));
    return c.body(null, 204);
  });

  // ─── Member ───────────────────────────────────────────────────────────────
  app.get('/me', (c) => c.json(membersSvc.memberDto(ctx, c.get('member'))));
  app.get('/me/membership', async (c) => c.json(await membersSvc.membershipDto(ctx, c.get('member'))));
  app.get('/me/overview', async (c) => c.json(await progress.todayOverview(ctx, c.get('member').id)));
  app.get('/me/next-class', async (c) => c.json(await classes.nextClass(ctx, c.get('member').id)));

  // ─── Classes ──────────────────────────────────────────────────────────────
  app.get('/classes', async (c) => {
    const date = c.req.query('date') ?? membersSvc.todayKey(ctx);
    if (!DATE.test(date)) throw badRequest('date must be YYYY-MM-DD.');
    return c.json(await classes.classesForDay(ctx, date));
  });
  app.get('/classes/:id', async (c) => c.json(await classes.classSession(ctx, c.req.param('id'))));
  app.post('/classes/:id/booking', async (c) => {
    await classes.book(ctx, c.get('member').id, c.req.param('id'));
    return c.body(null, 204);
  });
  app.delete('/classes/:id/booking', async (c) => {
    await classes.cancelBooking(ctx, c.get('member').id, c.req.param('id'));
    return c.body(null, 204);
  });
  app.get('/me/bookings', async (c) => {
    const filter = c.req.query('filter') === 'past' ? 'past' : 'upcoming';
    return c.json(await classes.memberBookings(ctx, c.get('member').id, filter));
  });

  // ─── Workouts & progress ──────────────────────────────────────────────────
  app.get('/workouts', async (c) => {
    const rows = await ctx.db.select().from(workouts).where(eq(workouts.popular, true));
    return c.json(
      rows.map((w) => ({
        id: w.id,
        name: w.name,
        durationMin: w.durationMin,
        category: w.category,
        intensityLabel: w.intensityLabel ?? undefined,
        photo: mediaUrl(ctx, w.photoUrl),
      })),
    );
  });
  app.get('/me/recommended-program', async (c) => {
    const [p] = await ctx.db.select().from(workoutPrograms).orderBy(desc(workoutPrograms.featured)).limit(1);
    if (!p) throw notFound('No programs yet.');
    return c.json({ id: p.id, title: p.title, workoutCount: p.workoutCount, photo: mediaUrl(ctx, p.photoUrl) });
  });
  app.get('/me/progress', async (c) => c.json(await progress.progressSummary(ctx, c.get('member'))));
  app.get('/me/calorie-goal', (c) => c.json({ kcal: c.get('member').calorieGoal }));
  app.put('/me/calorie-goal', async (c) => {
    const { kcal } = z
      .object({ kcal: z.number().int().min(500, 'Goal must be at least 500 kcal.').max(5000, 'Goal can be at most 5000 kcal.') })
      .parse(await c.req.json());
    await ctx.db.update(members).set({ calorieGoal: kcal }).where(eq(members.id, c.get('member').id));
    return c.json({ kcal });
  });

  // ─── Check-in ─────────────────────────────────────────────────────────────
  app.get('/me/check-in', async (c) => c.json(await checkin.checkInStatus(ctx, c.get('member').id)));
  app.post('/me/check-in', async (c) =>
    c.json(checkin.visitDto(await checkin.checkIn(ctx, c.get('member').id, 'app'))),
  );
  app.post('/me/check-out', async (c) => c.json(checkin.visitDto(await checkin.checkOut(ctx, c.get('member').id))));
  app.get('/me/visits', async (c) =>
    c.json(await checkin.recentVisits(ctx, c.get('member').id, Number(c.req.query('limit') ?? 10) || 10)),
  );

  app.post('/devices/scan', async (c) => {
    const key = c.req.header('X-Device-Key');
    if (!key) throw new ApiError(401, 'invalid_device', 'Missing device key.');
    const body = z
      .object({ code: z.string().min(1), direction: z.enum(['in', 'out']).optional() })
      .parse(await c.req.json());
    return c.json(await checkin.deviceScan(ctx, key, body.code, body.direction));
  });

  // ─── Billing ──────────────────────────────────────────────────────────────
  app.get('/plans', async (c) => c.json(await billing.listPlans(ctx)));
  app.get('/me/billing', async (c) => c.json(await billing.billingSummary(ctx, c.get('member').id)));
  app.get('/me/invoices', async (c) => c.json(await billing.listInvoices(ctx, c.get('member').id)));
  app.post('/me/checkout', async (c) => {
    const body = z
      .discriminatedUnion('kind', [
        z.object({ kind: z.literal('invoice'), invoiceId: z.string().uuid(), returnUrl: z.string().optional() }),
        z.object({ kind: z.literal('plan'), planId: z.string().min(1), returnUrl: z.string().optional() }),
      ])
      .parse(await c.req.json());
    return c.json(await billing.startCheckout(ctx, c.get('member'), body));
  });
  app.get('/me/checkout/:id', async (c) => {
    const id = c.req.param('id');
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound('Payment not found.');
    return c.json({ result: await billing.checkoutResult(ctx, c.get('member').id, id) });
  });

  // Paystack redirects the member's browser here after checkout.
  app.get('/payments/return', async (c) => c.html(await billing.returnPage(ctx, c.req.query('reference') ?? '')));

  // Paystack server-to-server notifications.
  app.post('/webhooks/paystack', async (c) => {
    const raw = await c.req.text();
    if (!verifyWebhookSignature(ctx.config.paystackSecretKey, raw, c.req.header('x-paystack-signature'))) {
      return c.json({ error: { code: 'invalid_signature', message: 'Invalid signature.' } }, 401);
    }
    const event = JSON.parse(raw) as { event: string; data: PaystackTransaction };
    if ((event.event === 'charge.success' || event.event === 'charge.failed') && event.data?.reference) {
      await billing.settlePayment(ctx, event.data.reference, event.data);
    }
    return c.json({ received: true });
  });

  return app;
}
