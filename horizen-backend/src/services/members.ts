import { and, eq, gt, sql } from 'drizzle-orm';

import type { Ctx } from '../context.js';
import { members, memberships, plans, sessions } from '../db/schema.js';
import { hashPassword, randomToken, sha256, verifyPassword } from '../lib/crypto.js';
import { ApiError } from '../lib/errors.js';
import { dateKeyIn } from '../lib/time.js';

export type MemberRow = typeof members.$inferSelect;

/** Turn a stored path like "/images/gym.jpg" into an absolute URL the app can load. */
export function mediaUrl(ctx: Ctx, path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return /^https?:\/\//.test(path) ? path : `${ctx.config.publicUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function memberDto(ctx: Ctx, m: MemberRow) {
  return {
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    memberNumber: m.memberNumber,
    level: m.level,
    avatar: mediaUrl(ctx, m.avatarUrl),
  };
}

export const todayKey = (ctx: Ctx) => dateKeyIn(ctx.config.timeZone, ctx.now());

export async function getMembershipRow(ctx: Ctx, memberId: string) {
  const [row] = await ctx.db
    .select({ membership: memberships, plan: plans })
    .from(memberships)
    .innerJoin(plans, eq(plans.id, memberships.planId))
    .where(eq(memberships.memberId, memberId));
  return row ?? null;
}

/** Active = paid up through today and not frozen by staff. */
export function isActive(ctx: Ctx, membership: typeof memberships.$inferSelect | null | undefined) {
  return !!membership && !membership.frozen && membership.validUntil >= todayKey(ctx);
}

export async function membershipDto(ctx: Ctx, member: MemberRow) {
  const row = await getMembershipRow(ctx, member.id);
  return {
    planName: row?.plan.name ?? 'No membership',
    status: isActive(ctx, row?.membership) ? ('active' as const) : ('expired' as const),
    validUntil: row?.membership.validUntil ?? todayKey(ctx),
    checkInCode: member.checkInCode,
  };
}

export async function requireActiveMembership(ctx: Ctx, memberId: string, action: string) {
  const row = await getMembershipRow(ctx, memberId);
  if (!isActive(ctx, row?.membership)) {
    throw new ApiError(403, 'membership_expired', `Your membership has expired. Please renew to ${action}.`);
  }
  return row!;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

const INVALID_LOGIN = new ApiError(401, 'invalid_credentials', 'Incorrect email or password.');

export async function login(ctx: Ctx, email: string, password: string) {
  const [member] = await ctx.db
    .select()
    .from(members)
    .where(sql`lower(${members.email}) = ${email.trim().toLowerCase()}`);
  // Always hash something so response time doesn't reveal whether the email exists.
  const ok = await verifyPassword(password, member?.passwordHash ?? 'scrypt$AAAA$AAAA');
  if (!member || !ok) throw INVALID_LOGIN;
  return { token: await createSession(ctx, member.id), member };
}

export async function createSession(ctx: Ctx, memberId: string) {
  const token = randomToken();
  const expiresAt = new Date(ctx.now().getTime() + ctx.config.sessionDays * 86_400_000);
  await ctx.db.insert(sessions).values({ tokenHash: sha256(token), memberId, expiresAt });
  return token;
}

export async function memberForToken(ctx: Ctx, token: string): Promise<MemberRow | null> {
  const [row] = await ctx.db
    .select({ member: members })
    .from(sessions)
    .innerJoin(members, eq(members.id, sessions.memberId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, ctx.now())));
  return row?.member ?? null;
}

export async function revokeSession(ctx: Ctx, token: string) {
  await ctx.db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

/** Used by seed/import scripts and (later) the admin panel. */
export async function createMember(
  ctx: Ctx,
  input: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    role?: 'member' | 'staff' | 'admin';
    avatarUrl?: string;
    level?: number;
    plan?: { planId: string; validUntil: string };
  },
) {
  const [{ count }] = await ctx.db.select({ count: sql<number>`count(*)::int` }).from(members);
  const [member] = await ctx.db
    .insert(members)
    .values({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.trim(),
      passwordHash: input.password ? await hashPassword(input.password) : null,
      memberNumber: `HZ-${String(count + 1).padStart(6, '0')}`,
      role: input.role ?? 'member',
      avatarUrl: input.avatarUrl,
      level: input.level ?? 1,
      checkInCode: `HZ1.${randomToken(18)}`,
    })
    .returning();
  if (input.plan) {
    await ctx.db.insert(memberships).values({ memberId: member.id, ...input.plan });
  }
  return member;
}
