import type {
  Coach,
  Member,
  Membership,
  PaymentMethod,
  Plan,
  ProgressSummary,
  TodayOverview,
  Workout,
  WorkoutProgram,
} from '../types';

/**
 * Sample content that mirrors the Horizen v2 design. Everything here is
 * throw-away once the Horizen backend is connected.
 */

export const photos = {
  gym: require('../../../assets/images/gym.jpg'),
  coach: require('../../../assets/images/coach.jpg'),
};

export const sampleMember: Member = {
  id: 'm-1001',
  firstName: 'Sam',
  lastName: 'Member',
  email: 'sam@example.com',
  memberNumber: 'HZ-004218',
  level: 8,
  avatar: photos.coach,
};

export const sampleMembership: Membership = {
  planName: 'Premium Monthly',
  status: process.env.EXPO_PUBLIC_MOCK_MEMBERSHIP === 'expired' ? 'expired' : 'active',
  validUntil: process.env.EXPO_PUBLIC_MOCK_MEMBERSHIP === 'expired' ? '2026-08-31' : '2027-08-31',
  checkInCode: 'HORIZEN:MEMBER:HZ-004218',
};

export const coaches: Record<string, Coach> = {
  lindiwe: {
    id: 'lindiwe',
    firstName: 'Lindiwe',
    fullName: 'Lindiwe Dlamini',
    title: 'HIIT Specialist',
    photo: photos.coach,
  },
  siya: { id: 'siya', firstName: 'Siya', fullName: 'Siya Nkosi', title: 'Strength Coach', photo: photos.coach },
  zoe: { id: 'zoe', firstName: 'Zoe', fullName: 'Zoe Adams', title: 'Yoga Instructor', photo: photos.gym },
  sarah: { id: 'sarah', firstName: 'Sarah', fullName: 'Sarah Botha', title: 'Pilates Instructor', photo: photos.gym },
};

export interface ClassTemplate {
  id: string;
  name: string;
  time: string; // HH:mm
  durationMin: number;
  levelLabel: string;
  tags: string[];
  description: string;
  coachId: keyof typeof coaches;
  photo: number;
  /** Which day offsets (0 = today) the class runs on. */
  runsOn: (dayOffset: number) => boolean;
}

export const classTemplates: ClassTemplate[] = [
  {
    id: 'str',
    name: 'Strength',
    time: '06:00',
    durationMin: 45,
    levelLabel: 'All levels',
    tags: ['45 Min', 'Strength', 'All levels'],
    description: 'Compound lifts and accessory work to build total-body strength with proper technique.',
    coachId: 'siya',
    photo: photos.coach,
    runsOn: () => true,
  },
  {
    id: 'yoga',
    name: 'Yoga Flow',
    time: '07:15',
    durationMin: 60,
    levelLabel: 'All levels',
    tags: ['60 Min', 'Low Intensity', 'All levels'],
    description: 'A flowing vinyasa practice to improve mobility, balance and breath control.',
    coachId: 'zoe',
    photo: photos.gym,
    runsOn: () => true,
  },
  {
    id: 'hiit',
    name: 'HIIT',
    time: '08:30',
    durationMin: 45,
    levelLabel: 'Intense',
    tags: ['45 Min', 'High Intensity', 'Intermediate'],
    description: 'Short, sharp intervals that push your heart rate up and torch calories.',
    coachId: 'lindiwe',
    photo: photos.coach,
    runsOn: (d) => d % 2 === 0,
  },
  {
    id: 'pil',
    name: 'Pilates',
    time: '17:30',
    durationMin: 45,
    levelLabel: 'All levels',
    tags: ['45 Min', 'Core', 'All levels'],
    description: 'Controlled mat-based movements to strengthen your core and improve posture.',
    coachId: 'sarah',
    photo: photos.gym,
    runsOn: () => true,
  },
  {
    id: 'hiitstr',
    name: 'HIIT Strength',
    time: '18:00',
    durationMin: 45,
    levelLabel: 'High Intensity',
    tags: ['45 Min', 'High Intensity', 'All levels'],
    description: 'A high-energy full-body workout designed to build strength, increase endurance and burn fat.',
    coachId: 'lindiwe',
    photo: photos.coach,
    runsOn: (d) => d % 2 === 0,
  },
];

/** Bookings the sample member starts with, as [templateId, dayOffset]. */
export const seededBookings: [string, number][] = [
  ['yoga', 2],
  ['pil', 4],
];

export const seededPastClasses: [string, number][] = [
  ['str', -4],
  ['hiit', -6],
  ['yoga', -8],
];

export const todayOverview: TodayOverview = {
  workoutsThisWeek: 5,
  caloriesToday: 1240,
  activeMinutesToday: 265,
};

export const recommendedProgram: WorkoutProgram = {
  id: 'upper-body-strength',
  title: 'Upper Body\nStrength',
  workoutCount: 6,
  photo: photos.gym,
};

export const workouts: Workout[] = [
  {
    id: 'w1',
    name: 'Full Body Burn',
    durationMin: 30,
    category: 'Cardio',
    intensityLabel: 'High Intensity',
    photo: photos.coach,
  },
  { id: 'w2', name: 'Core Crusher', durationMin: 20, category: 'Core', photo: photos.gym },
  { id: 'w3', name: 'Lower Body Power', durationMin: 35, category: 'Strength', photo: photos.gym },
  { id: 'w4', name: 'Morning Mobility', durationMin: 15, category: 'Mobility', photo: photos.coach },
];

export const progress: Omit<ProgressSummary, 'todayIndex'> = {
  weekCalories: [1240, 980, 1430, 760, 1650, 540, 890],
  workoutsDone: 5,
  workoutsTarget: 7,
  activeMinutes: 265,
  activeMinutesTarget: 360,
  monthTrend: [30, 38, 34, 46, 42, 55, 50, 62, 70, 82],
  monthChangePct: 12,
};

export const defaultCalorieGoal = 2000;

// ─── Billing ────────────────────────────────────────────────────────────────

/** ISO 4217 code for all sample amounts. Set EXPO_PUBLIC_CURRENCY to change it. */
export const currency = process.env.EXPO_PUBLIC_CURRENCY ?? 'ZAR';

export const plans: Plan[] = [
  {
    id: 'basic-monthly',
    name: 'Basic Monthly',
    price: { amount: 45000, currency },
    interval: 'month',
    perks: ['Gym floor access', 'Off-peak classes'],
  },
  {
    id: 'premium-monthly',
    name: 'Premium Monthly',
    price: { amount: 65000, currency },
    interval: 'month',
    perks: ['Gym floor access', 'Unlimited classes', 'Progress tracking'],
  },
  {
    id: 'premium-annual',
    name: 'Premium Annual',
    price: { amount: 650000, currency },
    interval: 'year',
    perks: ['Everything in Premium', '2 months free', 'Guest pass each month'],
  },
];

export const currentPlanId = 'premium-monthly';

export const paymentMethod: PaymentMethod = { type: 'card', label: 'Visa •••• 4242' };

/** Invoices as [id, description, monthsAgo, status]. The newest one is unpaid. */
export const seededInvoices: [string, string, number, 'paid' | 'due'][] = [
  ['inv-1003', 'Premium Monthly', 0, 'due'],
  ['inv-1002', 'Premium Monthly', 1, 'paid'],
  ['inv-1001', 'Premium Monthly', 2, 'paid'],
];

// ─── Visits ─────────────────────────────────────────────────────────────────

/** Past visits as [daysAgo, checkIn "HH:mm", minutes spent]. */
export const seededVisits: [number, string, number][] = [
  [1, '17:40', 72],
  [2, '06:05', 55],
  [4, '18:10', 64],
  [6, '07:20', 48],
];
