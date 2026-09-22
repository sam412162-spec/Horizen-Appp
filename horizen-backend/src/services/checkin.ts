import { and, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm';

import type { Ctx } from '../context.js';
import { devices, members, visits } from '../db/schema.js';
import { sha256 } from '../lib/crypto.js';
import { ApiError } from '../lib/errors.js';
import { dayRange } from '../lib/time.js';
import { getMembershipRow, isActive, mediaUrl, requireActiveMembership, todayKey } from './members.js';

type VisitRow = typeof visits.$inferSelect;
type Source = VisitRow['source'];

/** Visits left open longer than this are closed automatically. */
export const STALE_VISIT_HOURS = 12;
/** …and recorded as lasting this long, since we don't know when they really left. */
export const ASSUMED_VISIT_MINUTES = 90;

export function visitDto(v: VisitRow) {
  return {
    id: v.id,
    checkedInAt: v.checkedInAt.toISOString(),
    checkedOutAt: v.checkedOutAt?.toISOString(),
    source: v.source,
  };
}

/** Job (also run before reads): close visits members forgot to check out of. */
export async function closeStaleVisits(ctx: Ctx, memberId?: string) {
  const cutoff = new Date(ctx.now().getTime() - STALE_VISIT_HOURS * 3_600_000);
  await ctx.db
    .update(visits)
    .set({
      checkedOutAt: sql`${visits.checkedInAt} + (${ASSUMED_VISIT_MINUTES} * interval '1 minute')`,
      autoClosed: true,
    })
    .where(
      and(isNull(visits.checkedOutAt), lt(visits.checkedInAt, cutoff), memberId ? eq(visits.memberId, memberId) : undefined),
    );
}

async function openVisit(ctx: Ctx, memberId: string) {
  const [v] = await ctx.db
    .select()
    .from(visits)
    .where(and(eq(visits.memberId, memberId), isNull(visits.checkedOutAt)));
  return v ?? null;
}

export async function checkInStatus(ctx: Ctx, memberId: string) {
  await closeStaleVisits(ctx, memberId);
  const current = await openVisit(ctx, memberId);
  const monthStart = dayRange(`${todayKey(ctx).slice(0, 7)}-01`, ctx.config.timeZone)[0];
  const [{ n }] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(visits)
    .where(and(eq(visits.memberId, memberId), gte(visits.checkedInAt, monthStart)));
  return { current: current ? visitDto(current) : null, visitsThisMonth: n };
}

export async function checkIn(ctx: Ctx, memberId: string, source: Source) {
  await requireActiveMembership(ctx, memberId, 'check in');
  await closeStaleVisits(ctx, memberId);
  const existing = await openVisit(ctx, memberId);
  if (existing) return existing;
  const [v] = await ctx.db
    .insert(visits)
    .values({ memberId, checkedInAt: ctx.now(), source })
    .onConflictDoNothing() // the partial unique index guards against double taps
    .returning();
  return v ?? (await openVisit(ctx, memberId))!;
}

export async function checkOut(ctx: Ctx, memberId: string) {
  await closeStaleVisits(ctx, memberId);
  const existing = await openVisit(ctx, memberId);
  if (!existing) throw new ApiError(409, 'not_checked_in', 'You are not checked in.');
  const [v] = await ctx.db
    .update(visits)
    .set({ checkedOutAt: ctx.now() })
    .where(eq(visits.id, existing.id))
    .returning();
  return v;
}

export async function recentVisits(ctx: Ctx, memberId: string, limit: number) {
  await closeStaleVisits(ctx, memberId);
  const rows = await ctx.db
    .select()
    .from(visits)
    .where(and(eq(visits.memberId, memberId), sql`${visits.checkedOutAt} is not null`))
    .orderBy(desc(visits.checkedInAt))
    .limit(Math.min(Math.max(limit, 1), 50));
  return rows.map(visitDto);
}

// ─── Door device ────────────────────────────────────────────────────────────

/**
 * A door scanner reads a member's QR code (`checkInCode`) and asks whether to
 * let them through. Entering needs an active membership; leaving never blocks.
 */
export async function deviceScan(ctx: Ctx, deviceKey: string, code: string, direction?: 'in' | 'out') {
  const [device] = await ctx.db
    .select()
    .from(devices)
    .where(and(eq(devices.keyHash, sha256(deviceKey)), eq(devices.active, true)));
  if (!device) throw new ApiError(401, 'invalid_device', 'Unknown device.');
  await ctx.db.update(devices).set({ lastSeenAt: ctx.now() }).where(eq(devices.id, device.id));

  const [member] = await ctx.db.select().from(members).where(eq(members.checkInCode, code));
  if (!member) return { allowed: false, reason: 'unknown_code', member: null, visit: null };

  await closeStaleVisits(ctx, member.id);
  const open = await openVisit(ctx, member.id);
  const dir = direction ?? (device.mode === 'toggle' ? (open ? 'out' : 'in') : device.mode);
  const who = { firstName: member.firstName, photo: mediaUrl(ctx, member.avatarUrl) };

  if (dir === 'out') {
    const visit = open ? (await checkOut(ctx, member.id)) : null;
    return { allowed: true, direction: 'out', member: who, visit: visit ? visitDto(visit) : null };
  }
  const row = await getMembershipRow(ctx, member.id);
  if (!isActive(ctx, row?.membership)) {
    return { allowed: false, reason: 'membership_expired', direction: 'in', member: who, visit: null };
  }
  const visit = await checkIn(ctx, member.id, 'device');
  return { allowed: true, direction: 'in', member: who, visit: visitDto(visit) };
}
