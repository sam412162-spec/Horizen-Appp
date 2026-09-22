import { eq } from 'drizzle-orm';

import type { Ctx } from './context.js';
import { classTypes, coaches, members, plans, timetable, visits, workoutPrograms, workouts } from './db/schema.js';
import { addDaysKey, zonedToInstant } from './lib/time.js';
import { generateSessions } from './services/classes.js';
import { createMember, todayKey } from './services/members.js';

export const SAMPLE_MEMBER = { email: 'sam@example.com', password: 'horizen123' };
export const SAMPLE_ADMIN = { email: 'admin@horizengym.co.za', password: 'change-me-now' };

/** Sample data matching the app's design. Safe to run once on an empty database. */
export async function seed(ctx: Ctx) {
  const [already] = await ctx.db.select().from(plans).limit(1);
  if (already) return { skipped: true };
  const currency = ctx.config.currency;

  await ctx.db.insert(plans).values([
    { id: 'basic-monthly', name: 'Basic Monthly', priceCents: 45000, currency, interval: 'month', perks: ['Gym floor access', 'Off-peak classes'], sortOrder: 1 },
    { id: 'premium-monthly', name: 'Premium Monthly', priceCents: 65000, currency, interval: 'month', perks: ['Gym floor access', 'Unlimited classes', 'Progress tracking'], sortOrder: 2 },
    { id: 'premium-annual', name: 'Premium Annual', priceCents: 650000, currency, interval: 'year', perks: ['Everything in Premium', '2 months free', 'Guest pass each month'], sortOrder: 3 },
  ]);

  const [lindiwe, siya, zoe, sarah] = await ctx.db
    .insert(coaches)
    .values([
      { firstName: 'Lindiwe', fullName: 'Lindiwe Dlamini', title: 'HIIT Specialist', photoUrl: '/images/coach.jpg' },
      { firstName: 'Siya', fullName: 'Siya Nkosi', title: 'Strength Coach', photoUrl: '/images/coach.jpg' },
      { firstName: 'Zoe', fullName: 'Zoe Adams', title: 'Yoga Instructor', photoUrl: '/images/gym.jpg' },
      { firstName: 'Sarah', fullName: 'Sarah Botha', title: 'Pilates Instructor', photoUrl: '/images/gym.jpg' },
    ])
    .returning();

  const [strength, yoga, hiit, pilates, hiitStrength] = await ctx.db
    .insert(classTypes)
    .values([
      { name: 'Strength', durationMin: 45, levelLabel: 'All levels', tags: ['45 Min', 'Strength', 'All levels'], description: 'Compound lifts and accessory work to build total-body strength with proper technique.', photoUrl: '/images/coach.jpg' },
      { name: 'Yoga Flow', durationMin: 60, levelLabel: 'All levels', tags: ['60 Min', 'Low Intensity', 'All levels'], description: 'A flowing vinyasa practice to improve mobility, balance and breath control.', photoUrl: '/images/gym.jpg' },
      { name: 'HIIT', durationMin: 45, levelLabel: 'Intense', tags: ['45 Min', 'High Intensity', 'Intermediate'], description: 'Short, sharp intervals that push your heart rate up and torch calories.', photoUrl: '/images/coach.jpg' },
      { name: 'Pilates', durationMin: 45, levelLabel: 'All levels', tags: ['45 Min', 'Core', 'All levels'], description: 'Controlled mat-based movements to strengthen your core and improve posture.', photoUrl: '/images/gym.jpg' },
      { name: 'HIIT Strength', durationMin: 45, levelLabel: 'High Intensity', tags: ['45 Min', 'High Intensity', 'All levels'], description: 'A high-energy full-body workout designed to build strength, increase endurance and burn fat.', photoUrl: '/images/coach.jpg' },
    ])
    .returning();

  const weekdays = [1, 2, 3, 4, 5];
  const slots: (typeof timetable.$inferInsert)[] = [];
  for (const d of weekdays) {
    slots.push({ classTypeId: strength.id, coachId: siya.id, weekday: d, startTime: '06:00' });
    slots.push({ classTypeId: yoga.id, coachId: zoe.id, weekday: d, startTime: '07:15' });
    slots.push({ classTypeId: pilates.id, coachId: sarah.id, weekday: d, startTime: '17:30' });
  }
  for (const d of [1, 3, 5]) {
    slots.push({ classTypeId: hiit.id, coachId: lindiwe.id, weekday: d, startTime: '08:30' });
    slots.push({ classTypeId: hiitStrength.id, coachId: lindiwe.id, weekday: d, startTime: '18:00' });
  }
  slots.push({ classTypeId: yoga.id, coachId: zoe.id, weekday: 6, startTime: '08:00' });
  await ctx.db.insert(timetable).values(slots);
  await generateSessions(ctx, 14);

  await ctx.db.insert(workouts).values([
    { name: 'Full Body Burn', durationMin: 30, category: 'Cardio', intensityLabel: 'High Intensity', photoUrl: '/images/coach.jpg' },
    { name: 'Core Crusher', durationMin: 20, category: 'Core', photoUrl: '/images/gym.jpg' },
    { name: 'Lower Body Power', durationMin: 35, category: 'Strength', photoUrl: '/images/gym.jpg' },
    { name: 'Morning Mobility', durationMin: 15, category: 'Mobility', photoUrl: '/images/coach.jpg' },
  ]);
  await ctx.db.insert(workoutPrograms).values({ title: 'Upper Body\nStrength', workoutCount: 6, photoUrl: '/images/gym.jpg', featured: true });

  const today = todayKey(ctx);
  await createMember(ctx, { firstName: 'Horizen', lastName: 'Admin', email: SAMPLE_ADMIN.email, password: SAMPLE_ADMIN.password, role: 'admin' });
  const sam = await createMember(ctx, {
    firstName: 'Sam',
    lastName: 'Member',
    email: SAMPLE_MEMBER.email,
    password: SAMPLE_MEMBER.password,
    level: 8,
    avatarUrl: '/images/coach.jpg',
    plan: { planId: 'premium-monthly', validUntil: addDaysKey(today, 20) },
  });

  // A few past visits so progress screens have something to show.
  const tz = ctx.config.timeZone;
  const past: [number, string, number][] = [[1, '17:40', 72], [2, '06:05', 55], [4, '18:10', 64], [6, '07:20', 48], [9, '17:30', 60], [12, '06:10', 50]];
  await ctx.db.insert(visits).values(
    past.map(([daysAgo, time, minutes], i) => {
      const start = zonedToInstant(addDaysKey(today, -daysAgo), time, tz);
      return { memberId: sam.id, checkedInAt: start, checkedOutAt: new Date(start.getTime() + minutes * 60_000), source: i % 2 ? ('device' as const) : ('app' as const) };
    }),
  );
  const [check] = await ctx.db.select().from(members).where(eq(members.id, sam.id));
  return { skipped: false, member: check.email };
}
