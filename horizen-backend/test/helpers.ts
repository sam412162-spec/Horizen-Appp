import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import type { Ctx } from '../src/context.js';
import { createDatabase } from '../src/db/client.js';
import { hmacSha512Hex } from '../src/lib/crypto.js';
import type { PaystackClient, PaystackTransaction } from '../src/paystack.js';
import { SAMPLE_MEMBER, seed } from '../src/seed.js';

export const SECRET = 'sk_test_fake';

/** In-memory fake of Paystack: records calls and lets tests decide outcomes. */
export function fakePaystack() {
  const transactions = new Map<string, PaystackTransaction>();
  const calls: { method: string; args: unknown }[] = [];
  let chargeOutcome: 'success' | 'failed' = 'success';
  const client: PaystackClient = {
    async initializeTransaction(p) {
      calls.push({ method: 'initialize', args: p });
      transactions.set(p.reference, { reference: p.reference, status: 'abandoned', amount: p.amount, currency: p.currency });
      return { authorizationUrl: `https://checkout.paystack.test/${p.reference}`, accessCode: 'ac', reference: p.reference };
    },
    async verifyTransaction(reference) {
      calls.push({ method: 'verify', args: reference });
      const tx = transactions.get(reference);
      if (!tx) throw new Error('not found');
      return tx;
    },
    async chargeAuthorization(p) {
      calls.push({ method: 'charge', args: p });
      const tx: PaystackTransaction = {
        reference: p.reference,
        status: chargeOutcome,
        amount: p.amount,
        currency: p.currency,
        gateway_response: chargeOutcome === 'success' ? 'Approved' : 'Insufficient Funds',
        authorization: card(),
      };
      transactions.set(p.reference, tx);
      return tx;
    },
  };
  return {
    client,
    calls,
    transactions,
    /** Simulate the member completing payment on the hosted page. */
    complete(reference: string): PaystackTransaction {
      const tx = transactions.get(reference)!;
      const done = { ...tx, status: 'success' as const, authorization: card(), customer: { customer_code: 'CUS_test' } };
      transactions.set(reference, done);
      return done;
    },
    setChargeOutcome(o: 'success' | 'failed') {
      chargeOutcome = o;
    },
  };
}

const card = () => ({
  authorization_code: 'AUTH_test123',
  card_type: 'visa ',
  last4: '4081',
  exp_month: '12',
  exp_year: '2030',
  channel: 'card',
  reusable: true,
  signature: 'SIG_test',
});

export async function setup(opts: { seed?: boolean } = {}) {
  const database = createDatabase({ dataDir: 'memory' });
  await database.migrate();
  const clock = { now: new Date('2026-09-22T08:00:00Z') }; // Tue 10:00 in Johannesburg
  const paystack = fakePaystack();
  const config = { ...loadConfig({}), paystackSecretKey: SECRET, publicUrl: 'https://api.test' };
  const ctx: Ctx = { db: database.db, config, paystack: paystack.client, now: () => clock.now };
  if (opts.seed !== false) await seed(ctx);
  const app = createApp(ctx);

  async function call(method: string, path: string, init: { token?: string; body?: unknown; headers?: Record<string, string> } = {}) {
    const res = await app.request(path, {
      method,
      headers: {
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...init.headers,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, json };
  }

  async function login(email = SAMPLE_MEMBER.email, password = SAMPLE_MEMBER.password) {
    const res = await call('POST', '/auth/login', { body: { email, password } });
    return res.json.token as string;
  }

  async function webhook(event: string, data: PaystackTransaction, secret = SECRET) {
    const raw = JSON.stringify({ event, data });
    const res = await app.request('/webhooks/paystack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': hmacSha512Hex(secret, raw) },
      body: raw,
    });
    return res.status;
  }

  return { ctx, app, clock, paystack, call, login, webhook, close: () => database.close() };
}

export type TestEnv = Awaited<ReturnType<typeof setup>>;
