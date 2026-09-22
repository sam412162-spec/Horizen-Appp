import { and, eq, gte } from 'drizzle-orm';

import type { Ctx } from '../context.js';
import { visits } from '../db/schema.js';
import { addDaysKey, dateKeyIn, dayRange, startOfWeekKey } from '../lib/time.js';
import type { MemberRow } from './members.js';
import { todayKey } from './members.js';

/**
 * Progress is estimated from gym visits until wearable/fitness data is
 * connected: minutes in the gym = active minutes, and calories use a flat
 * average burn rate. Swap `estimateCalories` for real data later.
 */
export const KCAL_PER_ACTIVE_MINUTE = 7;
const estimateCalories = (minutes: number) => Math.round(minutes * KCAL_PER_ACTIVE_MINUTE);

async function visitMinutesByDay(ctx: Ctx, memberId: string, fromKey: string) {
  const [from] = dayRange(fromKey, ctx.config.timeZone);
  const rows = await ctx.db
    .select()
    .from(visits)
    .where(and(eq(visits.memberId, memberId), gte(visits.checkedInAt, from)));
  const now = ctx.now();
  const byDay = new Map<string, { minutes: number; count: number }>();
  for (const v of rows) {
    const end = v.checkedOutAt ?? now;
    const minutes = Math.max(0, Math.round((end.getTime() - v.checkedInAt.getTime()) / 60_000));
    const key = dateKeyIn(ctx.config.timeZone, v.checkedInAt);
    const cur = byDay.get(key) ?? { minutes: 0, count: 0 };
    byDay.set(key, { minutes: cur.minutes + minutes, count: cur.count + 1 });
  }
  return byDay;
}

export async function todayOverview(ctx: Ctx, memberId: string) {
  const today = todayKey(ctx);
  const weekStart = startOfWeekKey(today);
  const byDay = await visitMinutesByDay(ctx, memberId, weekStart);
  const todayMinutes = byDay.get(today)?.minutes ?? 0;
  const workouts = [...byDay.values()].reduce((n, d) => n + d.count, 0);
  return {
    workoutsThisWeek: workouts,
    caloriesToday: estimateCalories(todayMinutes),
    activeMinutesToday: todayMinutes,
  };
}

export async function progressSummary(ctx: Ctx, member: MemberRow) {
  const today = todayKey(ctx);
  const weekStart = startOfWeekKey(today);
  // 10 weeks for the trend, 60 days for the month comparison.
  const trendStart = addDaysKey(weekStart, -63);
  const earliest = addDaysKey(today, -59) < trendStart ? addDaysKey(today, -59) : trendStart;
  const byDay = await visitMinutesByDay(ctx, member.id, earliest);
  const minutesOn = (key: string) => byDay.get(key)?.minutes ?? 0;
  const sumRange = (from: string, days: number) =>
    Array.from({ length: days }, (_, i) => minutesOn(addDaysKey(from, i))).reduce((a, b) => a + b, 0);

  const weekKeys = Array.from({ length: 7 }, (_, i) => addDaysKey(weekStart, i));
  const weekCalories = weekKeys.map((k) => estimateCalories(minutesOn(k)));
  const workoutsDone = weekKeys.reduce((n, k) => n + (byDay.get(k)?.count ?? 0), 0);
  const activeMinutes = weekKeys.reduce((n, k) => n + minutesOn(k), 0);

  const weekly = Array.from({ length: 10 }, (_, i) => sumRange(addDaysKey(trendStart, i * 7), 7));
  const peak = Math.max(...weekly, 1);
  const monthTrend = weekly.map((m) => Math.max(4, Math.round((m / peak) * 100)));

  const last30 = sumRange(addDaysKey(today, -29), 30);
  const prev30 = sumRange(addDaysKey(today, -59), 30);
  const monthChangePct = prev30 === 0 ? (last30 > 0 ? 100 : 0) : Math.round(((last30 - prev30) / prev30) * 100);

  return {
    weekCalories,
    todayIndex: weekKeys.indexOf(today),
    workoutsDone,
    workoutsTarget: member.weeklyWorkoutTarget,
    activeMinutes,
    activeMinutesTarget: member.weeklyActiveMinutesTarget,
    monthTrend,
    monthChangePct,
  };
}
