import type {
  Billing,
  CheckInStatus,
  CheckoutSession,
  ClassSession,
  GymService,
  Invoice,
  Member,
  Membership,
  PaymentResult,
  Plan,
  ProgressSummary,
  TodayOverview,
  Visit,
  Workout,
  WorkoutProgram,
} from '../types';
import { toDateKey } from '../../utils/date';
import { getToken, setToken } from './session';

/**
 * Client for the Horizen backend (replaces GymMaster).
 *
 * The REST contract this file expects is documented in `docs/API.md`. JSON
 * bodies use the same shapes as `src/data/types.ts`, except images, which the
 * server sends as URL strings in `photo` / `avatar` fields.
 */

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!baseUrl) throw new Error('EXPO_PUBLIC_API_URL is not set.');
  const token = await getToken();
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) await setToken(null);
  if (!res.ok) {
    // Error bodies follow { "error": { "message": "..." } }.
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data?.error?.message ?? message;
    } catch {
      // not JSON
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return withImages(await res.json()) as T;
}

/** Converts `photo`/`avatar` URL strings into React Native image sources. */
function withImages(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withImages);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = (k === 'photo' || k === 'avatar') && typeof v === 'string' ? { uri: v } : withImages(v);
    }
    return out;
  }
  return value;
}

const get = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body: unknown = {}) => request<T>('POST', path, body);

type AuthResponse = { token: string; member: Member };

export function createApiGymService(): GymService {
  const authenticate = async (res: AuthResponse) => {
    await setToken(res.token);
    return res.member;
  };

  return {
    async signIn(email, password) {
      return authenticate(await post<AuthResponse>('/auth/login', { email, password }));
    },
    async signInWithGoogle() {
      // Needs a Google OAuth client (expo-auth-session) to get an ID token,
      // which is then exchanged at POST /auth/google { idToken }.
      throw new Error('Google sign-in is not set up yet. Please use email and password.');
    },
    async signOut() {
      await post('/auth/logout').catch(() => {});
      await setToken(null);
    },
    async restoreSession() {
      if (!(await getToken())) return null;
      try {
        return await get<Member>('/me');
      } catch {
        return null;
      }
    },

    getMembership: () => get<Membership>('/me/membership'),
    getTodayOverview: () => get<TodayOverview>('/me/overview'),
    getNextClass: () => get<ClassSession | null>('/me/next-class'),

    getClassesForDay: (date) => get<ClassSession[]>(`/classes?date=${toDateKey(date)}`),
    getClassSession: async (id) => {
      try {
        return await get<ClassSession>(`/classes/${encodeURIComponent(id)}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    getBookings: (_m, filter) => get<ClassSession[]>(`/me/bookings?filter=${filter}`),
    bookClass: (_m, id) => post<void>(`/classes/${encodeURIComponent(id)}/booking`),
    cancelBooking: (_m, id) => request<void>('DELETE', `/classes/${encodeURIComponent(id)}/booking`),

    getRecommendedProgram: () => get<WorkoutProgram>('/me/recommended-program'),
    getWorkouts: () => get<Workout[]>('/workouts'),

    getProgress: () => get<ProgressSummary>('/me/progress'),
    getCalorieGoal: async () => (await get<{ kcal: number }>('/me/calorie-goal')).kcal,
    setCalorieGoal: async (_m, kcal) => (await request<{ kcal: number }>('PUT', '/me/calorie-goal', { kcal })).kcal,

    getCheckInStatus: () => get<CheckInStatus>('/me/check-in'),
    checkIn: () => post<Visit>('/me/check-in', { source: 'app' }),
    checkOut: () => post<Visit>('/me/check-out'),
    getVisits: (_m, limit = 10) => get<Visit[]>(`/me/visits?limit=${limit}`),

    getBilling: () => get<Billing>('/me/billing'),
    getPlans: () => get<Plan[]>('/plans'),
    getInvoices: () => get<Invoice[]>('/me/invoices'),
    startCheckout: (_m, req) => post<CheckoutSession>('/me/checkout', req),
    getCheckoutResult: async (_m, id) =>
      (await get<{ result: PaymentResult }>(`/me/checkout/${encodeURIComponent(id)}`)).result,
  };
}
