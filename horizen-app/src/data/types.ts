import type { ImageSourcePropType } from 'react-native';

/**
 * Domain types used by the UI. They're kept independent of any backend so the
 * data source (sample data today, the Horizen backend later) can be swapped in
 * `src/data/index.ts` without touching screens.
 */

export type ImageRef = ImageSourcePropType;

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  memberNumber: string;
  level: number;
  avatar?: ImageRef;
}

export type MembershipStatus = 'active' | 'expired';

export interface Membership {
  planName: string;
  status: MembershipStatus;
  /** ISO date (yyyy-mm-dd) */
  validUntil: string;
  /** Value encoded in the check-in QR code (scanned at the front desk). */
  checkInCode: string;
}

export interface Coach {
  id: string;
  firstName: string;
  fullName: string;
  title: string;
  photo?: ImageRef;
}

export interface ClassSession {
  id: string;
  name: string;
  /** ISO timestamp */
  startsAt: string;
  durationMin: number;
  /** Short label shown in lists, e.g. "All levels" or "Intense". */
  levelLabel: string;
  /** Chips shown on the class detail screen, e.g. ["45 Min", "High Intensity", "All levels"]. */
  tags: string[];
  description: string;
  coach: Coach;
  photo: ImageRef;
  spotsLeft?: number;
}

export interface TodayOverview {
  workoutsThisWeek: number;
  caloriesToday: number;
  activeMinutesToday: number;
}

export type WorkoutCategory = 'Strength' | 'Cardio' | 'Mobility' | 'Core';

export interface Workout {
  id: string;
  name: string;
  durationMin: number;
  category: WorkoutCategory;
  /** Secondary label, e.g. "High Intensity". Falls back to the category. */
  intensityLabel?: string;
  photo: ImageRef;
}

export interface WorkoutProgram {
  id: string;
  title: string;
  workoutCount: number;
  photo: ImageRef;
}

export interface ProgressSummary {
  /** Calories burned per day, Monday first (7 values). */
  weekCalories: number[];
  /** Index (0 = Monday) of today within `weekCalories`. */
  todayIndex: number;
  workoutsDone: number;
  workoutsTarget: number;
  activeMinutes: number;
  activeMinutesTarget: number;
  /** Relative activity over recent weeks, 0–100 (oldest first). */
  monthTrend: number[];
  monthChangePct: number;
}

export type BookingFilter = 'upcoming' | 'past';

// ─── Check-in ────────────────────────────────────────────────────────────────

/** How a visit was recorded: self check-in in the app, or the door device later. */
export type CheckInSource = 'app' | 'device' | 'staff';

export interface Visit {
  id: string;
  /** ISO timestamp */
  checkedInAt: string;
  /** ISO timestamp; missing while the member is still in the gym. */
  checkedOutAt?: string;
  source: CheckInSource;
}

export interface CheckInStatus {
  /** The open visit, if the member is currently checked in. */
  current: Visit | null;
  visitsThisMonth: number;
}

// ─── Billing ────────────────────────────────────────────────────────────────

/** Amounts are in the smallest currency unit (cents) to avoid rounding errors. */
export interface Money {
  amount: number;
  currency: string;
}

export interface Plan {
  id: string;
  name: string;
  price: Money;
  interval: 'month' | 'year';
  perks: string[];
}

export type InvoiceStatus = 'paid' | 'due' | 'overdue' | 'failed';

export interface Invoice {
  id: string;
  description: string;
  amount: Money;
  /** ISO date */
  issuedAt: string;
  /** ISO date */
  dueAt: string;
  status: InvoiceStatus;
  /** ISO timestamp */
  paidAt?: string;
}

export interface PaymentMethod {
  type: 'card' | 'debit_order';
  /** e.g. "Visa •••• 4242" or "Debit order • FNB •••• 1234" */
  label: string;
}

export interface Billing {
  plan: Plan;
  /** ISO date of the next scheduled charge. */
  nextPaymentAt?: string;
  /** Total of unpaid invoices. */
  balance: Money;
  paymentMethod?: PaymentMethod;
}

/**
 * A payment is started by the backend, which returns the payment provider's
 * hosted checkout page. Card details never touch the app or our servers.
 */
export type CheckoutRequest = ({ kind: 'invoice'; invoiceId: string } | { kind: 'plan'; planId: string }) & {
  /** Deep link the payment page returns to (set by usePayment). */
  returnUrl?: string;
};

export interface CheckoutSession {
  id: string;
  /** Hosted checkout URL to open in the browser. `null` = settled immediately (sample data). */
  url: string | null;
}

export type PaymentResult = 'paid' | 'pending' | 'cancelled' | 'failed';

export interface GymService {
  // Auth
  signIn(email: string, password: string): Promise<Member>;
  signInWithGoogle(): Promise<Member>;
  signOut(): Promise<void>;
  /** Restore a saved session on app start. Resolves null when signed out. */
  restoreSession(): Promise<Member | null>;

  // Membership & check-in
  getMembership(memberId: string): Promise<Membership>;

  // Home
  getTodayOverview(memberId: string): Promise<TodayOverview>;
  getNextClass(memberId: string): Promise<ClassSession | null>;

  // Classes
  getClassesForDay(date: Date): Promise<ClassSession[]>;
  getClassSession(sessionId: string): Promise<ClassSession | null>;
  getBookings(memberId: string, filter: BookingFilter): Promise<ClassSession[]>;
  bookClass(memberId: string, sessionId: string): Promise<void>;
  cancelBooking(memberId: string, sessionId: string): Promise<void>;

  // Workouts
  getRecommendedProgram(memberId: string): Promise<WorkoutProgram>;
  getWorkouts(): Promise<Workout[]>;

  // Progress
  getProgress(memberId: string): Promise<ProgressSummary>;
  getCalorieGoal(memberId: string): Promise<number>;
  setCalorieGoal(memberId: string, kcal: number): Promise<number>;

  // Self check-in / check-out
  getCheckInStatus(memberId: string): Promise<CheckInStatus>;
  checkIn(memberId: string): Promise<Visit>;
  checkOut(memberId: string): Promise<Visit>;
  getVisits(memberId: string, limit?: number): Promise<Visit[]>;

  // Billing & payments
  getBilling(memberId: string): Promise<Billing>;
  getPlans(): Promise<Plan[]>;
  getInvoices(memberId: string): Promise<Invoice[]>;
  startCheckout(memberId: string, request: CheckoutRequest): Promise<CheckoutSession>;
  /** Ask the backend for the outcome after the checkout page closes. */
  getCheckoutResult(memberId: string, sessionId: string): Promise<PaymentResult>;
}
