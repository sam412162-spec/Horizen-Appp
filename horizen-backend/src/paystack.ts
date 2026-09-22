import { hmacSha512Hex, safeEqualHex } from './lib/crypto.js';

/**
 * Paystack integration (https://paystack.com/docs/api/).
 * Amounts are in the currency's subunit (cents for ZAR). Everything the rest of
 * the backend needs goes through this interface so tests can swap in a fake.
 */

export type PaystackTxStatus =
  | 'success'
  | 'failed'
  | 'abandoned'
  | 'reversed'
  | 'pending'
  | 'ongoing'
  | 'processing'
  | 'queued'
  | 'send_otp'
  | 'send_pin'
  | 'send_birthday'
  | 'send_phone'
  | 'open_url';

export interface PaystackAuthorization {
  authorization_code: string;
  card_type?: string;
  last4?: string;
  exp_month?: string;
  exp_year?: string;
  bank?: string;
  channel?: string;
  reusable?: boolean;
  signature?: string;
}

export interface PaystackTransaction {
  reference: string;
  status: PaystackTxStatus;
  amount: number;
  currency: string;
  gateway_response?: string;
  authorization?: PaystackAuthorization;
  customer?: { customer_code?: string; email?: string };
}

export interface PaystackClient {
  initializeTransaction(p: {
    email: string;
    amount: number;
    currency: string;
    reference: string;
    callbackUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ authorizationUrl: string; accessCode: string; reference: string }>;
  verifyTransaction(reference: string): Promise<PaystackTransaction>;
  chargeAuthorization(p: {
    authorizationCode: string;
    email: string;
    amount: number;
    currency: string;
    reference: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaystackTransaction>;
}

export class PaystackError extends Error {}

export function createPaystackClient(secretKey: string, baseUrl = 'https://api.paystack.co'): PaystackClient {
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!secretKey) throw new PaystackError('PAYSTACK_SECRET_KEY is not set.');
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
    if (!res.ok || !json?.status) {
      throw new PaystackError(`Paystack ${method} ${path} failed (${res.status}): ${json?.message ?? 'no body'}`);
    }
    return json.data as T;
  }

  return {
    async initializeTransaction(p) {
      const data = await call<{ authorization_url: string; access_code: string; reference: string }>(
        'POST',
        '/transaction/initialize',
        {
          email: p.email,
          amount: p.amount,
          currency: p.currency,
          reference: p.reference,
          callback_url: p.callbackUrl,
          metadata: p.metadata,
        },
      );
      return { authorizationUrl: data.authorization_url, accessCode: data.access_code, reference: data.reference };
    },
    verifyTransaction: (reference) =>
      call<PaystackTransaction>('GET', `/transaction/verify/${encodeURIComponent(reference)}`),
    chargeAuthorization: (p) =>
      call<PaystackTransaction>('POST', '/transaction/charge_authorization', {
        authorization_code: p.authorizationCode,
        email: p.email,
        amount: p.amount,
        currency: p.currency,
        reference: p.reference,
        metadata: p.metadata,
      }),
  };
}

/** Paystack signs webhook bodies with HMAC-SHA512 of the raw body using the secret key. */
export function verifyWebhookSignature(secretKey: string, rawBody: string, signature: string | undefined): boolean {
  if (!secretKey || !signature) return false;
  return safeEqualHex(hmacSha512Hex(secretKey, rawBody), signature);
}
