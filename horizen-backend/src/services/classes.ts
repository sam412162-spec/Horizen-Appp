import { and, asc, desc, eq, gt, gte, inArray, lt, sql, type SQL } from 'drizzle-orm';

import type { Ctx } from '../context.js';
import { bookings, classSessions, classTypes, coaches, timetable } from '../db/schema.js';
import { ApiError, notFound } from '../lib/errors.js';
import { addDaysKey, dayRange, weekdayOf, zonedToInstant } from '../lib/time.js';
import { mediaUrl, requireActiveMembership, todayKey } from './members.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SessionJoin = {
  session: typeof classSessions.$inferSelect;
  type: typeof classTypes.$inferSelect;
  coach: typeof coaches.$inferSelect;
};

async function querySessions(ctx: Ctx, where: SQL | undefined, order: 'asc' | 'desc' = 'asc', limit?: number) {
  const q = ctx.db
    .select({ session: classSessions, type: classTypes, coach: coaches })
    .from(classSessions)
    .innerJoin(classTypes, eq(classTypes.id, classSessions.classTypeId))
    .innerJoin(coaches, eq(coaches.id, classSessions.coachId))
    .where(and(eq(classSessions.cancelled, false), where))
    .orderBy(order === 'asc' ? asc(classSessions.startsAt) : desc(classSessions.startsAt));
  return limit ? q.limit(limit) : q;
}

async function toDtos(ctx: Ctx, rows: SessionJoin[]) {
  if (rows.length === 0) return [];
  const counts = await ctx.db
    .select({ sessionId: bookings.sessionId, n: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      inArray(
        bookings.sessionId,
        rows.map((r) => r.session.id),
      ),
    )
    .groupBy(bookings.sessionId);
  const booked = new Map(counts.map((c) => [c.sessionId, c.n]));
  return rows.map(({ session, type, coach }) => ({
    id: session.id,
    name: type.name,
    startsAt: session.startsAt.toISOString(),
    durationMin: type.durationMin,
    levelLabel: type.levelLabel,
    tags: type.tags,
    description: type.description,
    coach: {
      id: coach.id,
      firstName: coach.firstName,
      fullName: coach.fullName,
      title: coach.title,
      photo: mediaUrl(ctx, coach.photoUrl),
    },
    photo: mediaUrl(ctx, type.photoUrl),
    spotsLeft: Math.max(0, session.capacity - (booked.get(session.id) ?? 0)),
  }));
}

export async function classesForDay(ctx: Ctx, dateKey: string) {
  const [start, end] = dayRange(dateKey, ctx.config.timeZone);
  const rows = await querySessions(ctx, and(gte(classSessions.startsAt, start), lt(classSessions.startsAt, end)));
  return toDtos(ctx, rows);
}

export async function classSession(ctx: Ctx, id: string) {
  if (!UUID.test(id)) throw notFound('Class not found.');
  const rows = await querySessions(ctx, eq(classSessions.id, id));
  if (!rows.length) throw notFound('Class not found.');
  return (await toDtos(ctx, rows))[0];
}

const bookedBy = (memberId: string) =>
  inArray(
    classSessions.id,
    // subquery: sessions this member booked
    sqlBookedSessionIds(memberId),
  );

function sqlBookedSessionIds(memberId: string) {
  return sql`(select ${bookings.sessionId} from ${bookings} where ${bookings.memberId} = ${memberId})`;
}

export async function memberBookings(ctx: Ctx, memberId: string, filter: 'upcoming' | 'past') {
  const now = ctx.now();
  if (filter === 'upcoming') {
    // Still upcoming until the class has finished.
    const rows = await querySessions(
      ctx,
      and(
        bookedBy(memberId),
        sql`${classSessions.startsAt} + (${classTypes.durationMin} * interval '1 minute') > ${now.toISOString()}::timestamptz`,
      ),
    );
    return toDtos(ctx, rows);
  }
  const rows = await querySessions(ctx, and(bookedBy(memberId), lt(classSessions.startsAt, now)), 'desc', 20);
  return toDtos(ctx, rows);
}

/** The member's next booked class, or else the next class on the timetable. */
export async function nextClass(ctx: Ctx, memberId: string) {
  const now = ctx.now();
  const [mine] = await querySessions(ctx, and(bookedBy(memberId), gt(classSessions.startsAt, now)), 'asc', 1);
  const row = mine ?? (await querySessions(ctx, gt(classSessions.startsAt, now), 'asc', 1))[0];
  return row ? (await toDtos(ctx, [row]))[0] : null;
}

export async function book(ctx: Ctx, memberId: string, sessionId: string) {
  await requireActiveMembership(ctx, memberId, 'book classes');
  if (!UUID.test(sessionId)) throw notFound('Class not found.');
  await ctx.db.transaction(async (tx) => {
    // Lock the session row so two members can't take the last spot at once.
    const [session] = await tx
      .select()
      .from(classSessions)
      .where(and(eq(classSessions.id, sessionId), eq(classSessions.cancelled, false)))
      .for('update');
    if (!session) throw notFound('Class not found.');
    if (session.startsAt <= ctx.now()) throw new ApiError(409, 'class_started', 'This class has already started.');
    const [existing] = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.memberId, memberId), eq(bookings.sessionId, sessionId)));
    if (existing) throw new ApiError(409, 'already_booked', 'You have already booked this class.');
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(bookings)
      .where(eq(bookings.sessionId, sessionId));
    if (n >= session.capacity) throw new ApiError(409, 'class_full', 'Sorry, this class is full.');
    await tx.insert(bookings).values({ memberId, sessionId });
  });
}

export async function cancelBooking(ctx: Ctx, memberId: string, sessionId: string) {
  if (!UUID.test(sessionId)) throw notFound('Class not found.');
  await ctx.db.delete(bookings).where(and(eq(bookings.memberId, memberId), eq(bookings.sessionId, sessionId)));
}

/** Job: create class sessions from the weekly timetable for the next `days` days. */
export async function generateSessions(ctx: Ctx, days = 14) {
  const rows = await ctx.db
    .select({ slot: timetable, type: classTypes })
    .from(timetable)
    .innerJoin(classTypes, eq(classTypes.id, timetable.classTypeId))
    .where(and(eq(timetable.active, true), eq(classTypes.active, true)));
  const today = todayKey(ctx);
  const values: (typeof classSessions.$inferInsert)[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDaysKey(today, i);
    for (const { slot, type } of rows) {
      if (slot.weekday !== weekdayOf(day)) continue;
      values.push({
        classTypeId: type.id,
        coachId: slot.coachId,
        timetableId: slot.id,
        startsAt: zonedToInstant(day, slot.startTime, ctx.config.timeZone),
        capacity: slot.capacity ?? type.defaultCapacity,
      });
    }
  }
  if (values.length) await ctx.db.insert(classSessions).values(values).onConflictDoNothing();
  return values.length;
}
