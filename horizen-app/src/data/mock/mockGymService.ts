import type { BookingFilter, ClassSession, GymService, Invoice, Member, Visit } from '../types';
import { addDays, startOfDay, toDateKey } from '../../utils/date';
import {
  classTemplates,
  coaches,
  currency,
  currentPlanId,
  defaultCalorieGoal,
  paymentMethod,
  plans,
  progress,
  recommendedProgram,
  sampleMember,
  sampleMembership,
  seededBookings,
  seededInvoices,
  seededPastClasses,
  seededVisits,
  todayOverview,
  workouts,
  type ClassTemplate,
} from './sampleData';

/** Small artificial delay so loading states are exercised during development. */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

function sessionId(templateId: string, date: Date) {
  return `${templateId}_${toDateKey(date)}`;
}

function buildSession(t: ClassTemplate, day: Date): ClassSession {
  const [h, m] = t.time.split(':').map(Number);
  const startsAt = new Date(day);
  startsAt.setHours(h, m, 0, 0);
  return {
    id: sessionId(t.id, day),
    name: t.name,
    startsAt: startsAt.toISOString(),
    durationMin: t.durationMin,
    levelLabel: t.levelLabel,
    tags: t.tags,
    description: t.description,
    coach: coaches[t.coachId],
    photo: t.photo,
    spotsLeft: 8,
  };
}

function sessionFromId(id: string): ClassSession | null {
  const [templateId, dateKey] = id.split('_');
  const t = classTemplates.find((c) => c.id === templateId);
  if (!t || !dateKey) return null;
  const [y, mo, d] = dateKey.split('-').map(Number);
  return buildSession(t, new Date(y, mo - 1, d));
}

function offsetToSessionId([templateId, offset]: [string, number]) {
  return sessionId(templateId, addDays(startOfDay(new Date()), offset));
}

function seedVisits(): Visit[] {
  const today = startOfDay(new Date());
  return seededVisits.map(([daysAgo, time, minutes], i) => {
    const [h, m] = time.split(':').map(Number);
    const start = addDays(today, -daysAgo);
    start.setHours(h, m, 0, 0);
    return {
      id: `v-${i + 1}`,
      checkedInAt: start.toISOString(),
      checkedOutAt: new Date(start.getTime() + minutes * 60_000).toISOString(),
      source: i % 2 ? 'device' : 'app',
    };
  });
}

function seedInvoices(): Invoice[] {
  const now = new Date();
  return seededInvoices.map(([id, description, monthsAgo, status]) => {
    const issued = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const due = new Date(issued.getFullYear(), issued.getMonth(), 7);
    const plan = plans.find((p) => p.id === currentPlanId)!;
    return {
      id,
      description,
      amount: plan.price,
      issuedAt: toDateKey(issued),
      dueAt: toDateKey(due),
      status: status === 'due' && due < now ? 'overdue' : status,
      paidAt: status === 'paid' ? new Date(due.getTime() - 86_400_000).toISOString() : undefined,
    };
  });
}

export function createMockGymService(): GymService {
  // In-memory state; resets whenever the app reloads.
  const booked = new Set<string>(seededBookings.map(offsetToSessionId));
  const attended = seededPastClasses.map(offsetToSessionId);
  let calorieGoal = defaultCalorieGoal;
  let member: Member | null = null;
  const visits = seedVisits();
  let openVisit: Visit | null = null;
  const invoices = seedInvoices();
  let planId = currentPlanId;
  // Checkout sessions created by startCheckout, settled when the result is read.
  const checkouts = new Map<string, () => void>();

  const byStart = (a: ClassSession, b: ClassSession) => a.startsAt.localeCompare(b.startsAt);

  return {
    async signIn(email, password) {
      await delay(500);
      if (!email.trim() || !password) throw new Error('Please enter your email and password.');
      member = { ...sampleMember, email: email.trim() };
      return member;
    },

    async signInWithGoogle() {
      await delay(500);
      member = sampleMember;
      return member;
    },

    async signOut() {
      member = null;
    },

    async restoreSession() {
      // Sample data doesn't persist sessions: every launch starts signed out.
      return null;
    },

    async getMembership() {
      await delay();
      return sampleMembership;
    },

    async getTodayOverview() {
      await delay();
      return todayOverview;
    },

    async getNextClass() {
      await delay();
      // The next HIIT Strength session that hasn't started yet.
      const featured = classTemplates.find((c) => c.id === 'hiitstr')!;
      const today = startOfDay(new Date());
      for (let offset = 0; offset < 14; offset++) {
        if (!featured.runsOn(offset)) continue;
        const session = buildSession(featured, addDays(today, offset));
        if (new Date(session.startsAt).getTime() > Date.now()) return session;
      }
      return null;
    },

    async getClassesForDay(date) {
      await delay(150);
      const offset = Math.round((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);
      return classTemplates
        .filter((t) => t.runsOn(offset))
        .map((t) => buildSession(t, startOfDay(date)))
        .sort(byStart);
    },

    async getClassSession(id) {
      await delay(100);
      return sessionFromId(id);
    },

    async getBookings(_memberId, filter: BookingFilter) {
      await delay();
      if (filter === 'past') {
        return attended
          .map(sessionFromId)
          .filter((s): s is ClassSession => !!s)
          .sort((a, b) => byStart(b, a));
      }
      const now = Date.now();
      return [...booked]
        .map(sessionFromId)
        .filter((s): s is ClassSession => !!s && new Date(s.startsAt).getTime() + s.durationMin * 60_000 > now)
        .sort(byStart);
    },

    async bookClass(_memberId, id) {
      await delay(300);
      booked.add(id);
    },

    async cancelBooking(_memberId, id) {
      await delay(300);
      booked.delete(id);
    },

    async getRecommendedProgram() {
      await delay();
      return recommendedProgram;
    },

    async getWorkouts() {
      await delay();
      return workouts;
    },

    async getProgress() {
      await delay();
      const todayIndex = (new Date().getDay() + 6) % 7;
      return { ...progress, todayIndex };
    },

    async getCalorieGoal() {
      return calorieGoal;
    },

    async setCalorieGoal(_memberId, kcal) {
      await delay(200);
      calorieGoal = Math.round(kcal);
      return calorieGoal;
    },

    async getCheckInStatus() {
      await delay(150);
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
      const all = openVisit ? [openVisit, ...visits] : visits;
      return {
        current: openVisit,
        visitsThisMonth: all.filter((v) => new Date(v.checkedInAt).getTime() >= monthStart).length,
      };
    },

    async checkIn() {
      await delay(400);
      if (sampleMembership.status !== 'active')
        throw new Error('Your membership has expired. Please renew to check in.');
      if (!openVisit) {
        openVisit = { id: `v-${Date.now()}`, checkedInAt: new Date().toISOString(), source: 'app' };
      }
      return openVisit;
    },

    async checkOut() {
      await delay(400);
      if (!openVisit) throw new Error('You are not checked in.');
      const closed = { ...openVisit, checkedOutAt: new Date().toISOString() };
      visits.unshift(closed);
      openVisit = null;
      return closed;
    },

    async getVisits(_memberId, limit = 10) {
      await delay();
      return visits.slice(0, limit);
    },

    async getBilling() {
      await delay();
      const plan = plans.find((p) => p.id === planId)!;
      const unpaid = invoices.filter((i) => i.status !== 'paid');
      const now = new Date();
      return {
        plan,
        nextPaymentAt: toDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
        balance: { amount: unpaid.reduce((sum, i) => sum + i.amount.amount, 0), currency },
        paymentMethod,
      };
    },

    async getPlans() {
      await delay();
      return plans;
    },

    async getInvoices() {
      await delay();
      return invoices;
    },

    async startCheckout(_memberId, request) {
      await delay(400);
      const id = `chk-${Date.now()}`;
      checkouts.set(id, () => {
        if (request.kind === 'invoice') {
          const inv = invoices.find((i) => i.id === request.invoiceId);
          if (inv) Object.assign(inv, { status: 'paid', paidAt: new Date().toISOString() });
        } else {
          planId = request.planId;
        }
      });
      // A real backend returns the payment provider's hosted checkout URL here.
      return { id, url: null };
    },

    async getCheckoutResult(_memberId, sessionId) {
      await delay(600);
      const settle = checkouts.get(sessionId);
      if (!settle) return 'failed';
      settle();
      checkouts.delete(sessionId);
      return 'paid';
    },
  };
}
