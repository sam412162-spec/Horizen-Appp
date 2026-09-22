import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

// ─── People & auth ──────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', ['member', 'staff', 'admin']);

export const members = pgTable('members', {
  id: id(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  /** scrypt hash; null for members imported without a password yet. */
  passwordHash: text('password_hash'),
  memberNumber: text('member_number').notNull().unique(),
  role: roleEnum('role').notNull().default('member'),
  level: integer('level').notNull().default(1),
  avatarUrl: text('avatar_url'),
  calorieGoal: integer('calorie_goal').notNull().default(2000),
  weeklyWorkoutTarget: integer('weekly_workout_target').notNull().default(5),
  weeklyActiveMinutesTarget: integer('weekly_active_minutes_target').notNull().default(360),
  /** Opaque value in the member's QR code. Rotate it to invalidate a leaked code. */
  checkInCode: text('check_in_code').notNull().unique(),
  paystackCustomerCode: text('paystack_customer_code'),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('members_email_lower').on(sql`lower(${t.email})`)]);

/** Login sessions. Only a SHA-256 hash of the bearer token is stored. */
export const sessions = pgTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// ─── Plans, memberships & billing ───────────────────────────────────────────

export const intervalEnum = pgEnum('billing_interval', ['month', 'year']);

export const plans = pgTable('plans', {
  id: text('id').primaryKey(), // e.g. "premium-monthly"
  name: text('name').notNull(),
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').notNull().default('ZAR'),
  interval: intervalEnum('interval').notNull(),
  perks: jsonb('perks').$type<string[]>().notNull().default([]),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const memberships = pgTable('memberships', {
  id: id(),
  memberId: uuid('member_id').notNull().unique().references(() => members.id, { onDelete: 'cascade' }),
  planId: text('plan_id').notNull().references(() => plans.id),
  /** Last day (inclusive, gym time zone) the membership is valid. Active = today <= validUntil. */
  validUntil: date('valid_until').notNull(),
  autoRenew: boolean('auto_renew').notNull().default(true),
  /** Staff can freeze a membership (e.g. medical); frozen members can't check in. */
  frozen: boolean('frozen').notNull().default(false),
  createdAt: createdAt(),
});

/** A saved Paystack card authorization, reused for automatic renewals. */
export const paymentMethods = pgTable('payment_methods', {
  id: id(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  type: text('type').$type<'card' | 'debit_order'>().notNull().default('card'),
  label: text('label').notNull(), // "Visa •••• 4242"
  authorizationCode: text('authorization_code').notNull(),
  signature: text('signature'), // Paystack card signature, used to de-duplicate cards
  reusable: boolean('reusable').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(true),
  createdAt: createdAt(),
});

export const invoiceStatusEnum = pgEnum('invoice_status', ['due', 'paid', 'failed', 'void']);

export const invoices = pgTable('invoices', {
  id: id(),
  number: text('number').notNull().unique(), // "INV-000123"
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull(),
  planId: text('plan_id').references(() => plans.id),
  /** Membership is extended to at least this date when the invoice is paid. */
  periodEnd: date('period_end'),
  issuedAt: date('issued_at').notNull(),
  dueAt: date('due_at').notNull(),
  status: invoiceStatusEnum('status').notNull().default('due'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index('invoices_member').on(t.memberId)]);

export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'cancelled']);

/** One attempt to collect money through Paystack (checkout page or saved card). */
export const payments = pgTable('payments', {
  id: id(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  /** Our reference, sent to Paystack and echoed back in webhooks. */
  reference: text('reference').notNull().unique(),
  kind: text('kind').$type<'invoice' | 'plan' | 'renewal'>().notNull(),
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  planId: text('plan_id').references(() => plans.id),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  checkoutUrl: text('checkout_url'),
  /** App deep link to send the member back to after the Paystack page. */
  returnUrl: text('return_url'),
  /** Card authorization used (automatic renewals). */
  paymentMethodId: uuid('payment_method_id').references(() => paymentMethods.id, { onDelete: 'set null' }),
  failureReason: text('failure_reason'),
  createdAt: createdAt(),
  settledAt: timestamp('settled_at', { withTimezone: true }),
});

// ─── Classes ────────────────────────────────────────────────────────────────

export const coaches = pgTable('coaches', {
  id: id(),
  firstName: text('first_name').notNull(),
  fullName: text('full_name').notNull(),
  title: text('title').notNull(),
  photoUrl: text('photo_url'),
  active: boolean('active').notNull().default(true),
});

export const classTypes = pgTable('class_types', {
  id: id(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  durationMin: integer('duration_min').notNull(),
  levelLabel: text('level_label').notNull().default('All levels'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  photoUrl: text('photo_url'),
  defaultCapacity: integer('default_capacity').notNull().default(20),
  active: boolean('active').notNull().default(true),
});

/** The weekly timetable staff edit. Sessions are generated from it ahead of time. */
export const timetable = pgTable('timetable', {
  id: id(),
  classTypeId: uuid('class_type_id').notNull().references(() => classTypes.id, { onDelete: 'cascade' }),
  coachId: uuid('coach_id').notNull().references(() => coaches.id),
  /** 0 = Sunday … 6 = Saturday */
  weekday: integer('weekday').notNull(),
  /** "HH:mm" in the gym's time zone */
  startTime: text('start_time').notNull(),
  capacity: integer('capacity'),
  active: boolean('active').notNull().default(true),
});

export const classSessions = pgTable('class_sessions', {
  id: id(),
  classTypeId: uuid('class_type_id').notNull().references(() => classTypes.id, { onDelete: 'cascade' }),
  coachId: uuid('coach_id').notNull().references(() => coaches.id),
  timetableId: uuid('timetable_id').references(() => timetable.id, { onDelete: 'set null' }),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  capacity: integer('capacity').notNull(),
  cancelled: boolean('cancelled').notNull().default(false),
}, (t) => [
  index('class_sessions_starts').on(t.startsAt),
  uniqueIndex('class_sessions_slot').on(t.timetableId, t.startsAt),
]);

export const bookings = pgTable('bookings', {
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').notNull().references(() => classSessions.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.memberId, t.sessionId] })]);

// ─── Check-ins ──────────────────────────────────────────────────────────────

export const visitSourceEnum = pgEnum('visit_source', ['app', 'device', 'staff']);

export const visits = pgTable('visits', {
  id: id(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }).notNull(),
  checkedOutAt: timestamp('checked_out_at', { withTimezone: true }),
  source: visitSourceEnum('source').notNull(),
  /** True when the system closed a visit the member forgot to check out of. */
  autoClosed: boolean('auto_closed').notNull().default(false),
}, (t) => [
  index('visits_member_time').on(t.memberId, t.checkedInAt),
  // At most one open visit per member.
  uniqueIndex('visits_one_open').on(t.memberId).where(sql`${t.checkedOutAt} is null`),
]);

/** Door scanners / turnstiles. Each authenticates with its own key (stored hashed). */
export const devices = pgTable('devices', {
  id: id(),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  /** What a scan does when the member has no open visit / an open visit. */
  mode: text('mode').$type<'toggle' | 'in' | 'out'>().notNull().default('toggle'),
  active: boolean('active').notNull().default(true),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
});

// ─── Workouts ───────────────────────────────────────────────────────────────

export const workouts = pgTable('workouts', {
  id: id(),
  name: text('name').notNull(),
  durationMin: integer('duration_min').notNull(),
  category: text('category').$type<'Strength' | 'Cardio' | 'Mobility' | 'Core'>().notNull(),
  intensityLabel: text('intensity_label'),
  photoUrl: text('photo_url'),
  popular: boolean('popular').notNull().default(true),
});

export const workoutPrograms = pgTable('workout_programs', {
  id: id(),
  title: text('title').notNull(),
  workoutCount: integer('workout_count').notNull(),
  photoUrl: text('photo_url'),
  featured: boolean('featured').notNull().default(false),
});
