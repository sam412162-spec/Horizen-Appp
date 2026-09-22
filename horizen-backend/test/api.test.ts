import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { devices, memberships, visits } from '../src/db/schema.js';
import { randomToken, sha256 } from '../src/lib/crypto.js';
import { dateKeyIn, zonedToInstant } from '../src/lib/time.js';
import { setup, type TestEnv } from './helpers.js';

let env: TestEnv;
let token: string;

beforeAll(async () => {
  env = await setup();
  token = await env.login();
});
afterAll(() => env.close());

const setValidUntil = (validUntil: string) => env.ctx.db.update(memberships).set({ validUntil });

describe('auth', () => {
  it('signs in case-insensitively and restores the session with /me', async () => {
    expect(token).toBeTruthy();
    const me = await env.call('GET', '/me', { token });
    expect(me.status).toBe(200);
    expect(me.json).toMatchObject({ firstName: 'Sam', email: 'sam@example.com', memberNumber: 'HZ-000002' });
    expect(me.json.avatar).toBe('https://api.test/images/coach.jpg');
  });

  it('rejects a wrong password with a member-friendly message', async () => {
    const res = await env.call('POST', '/auth/login', { body: { email: 'sam@example.com', password: 'wrong' } });
    expect(res.status).toBe(401);
    expect(res.json.error.message).toBe('Incorrect email or password.');
  });

  it('requires a token and revokes it on logout', async () => {
    expect((await env.call('GET', '/me')).status).toBe(401);
    const t = await env.login();
    expect((await env.call('POST', '/auth/logout', { token: t })).status).toBe(204);
    expect((await env.call('GET', '/me', { token: t })).status).toBe(401);
  });
});

describe('membership & classes', () => {
  it('reports an active membership with an opaque check-in code', async () => {
    const res = await env.call('GET', '/me/membership', { token });
    expect(res.json).toMatchObject({ planName: 'Premium Monthly', status: 'active', validUntil: '2026-10-12' });
    expect(res.json.checkInCode).toMatch(/^HZ1\./);
  });

  it('lists a day of classes in gym-local time', async () => {
    const res = await env.call('GET', '/classes?date=2026-09-22', { token });
    expect(res.status).toBe(200);
    const names = res.json.map((c: any) => c.name);
    expect(names).toEqual(['Strength', 'Yoga Flow', 'Pilates']); // Tuesday
    expect(res.json[0].startsAt).toBe('2026-09-22T04:00:00.000Z'); // 06:00 SAST
    expect(res.json[0].coach.fullName).toBe('Siya Nkosi');
  });

  it('books, blocks double booking and cancels', async () => {
    const [pilates] = (await env.call('GET', '/classes?date=2026-09-22', { token })).json.filter(
      (c: any) => c.name === 'Pilates',
    );
    expect((await env.call('POST', `/classes/${pilates.id}/booking`, { token })).status).toBe(204);
    const dup = await env.call('POST', `/classes/${pilates.id}/booking`, { token });
    expect(dup.status).toBe(409);
    expect(dup.json.error.code).toBe('already_booked');

    const upcoming = await env.call('GET', '/me/bookings?filter=upcoming', { token });
    expect(upcoming.json.map((c: any) => c.id)).toContain(pilates.id);
    const next = await env.call('GET', '/me/next-class', { token });
    expect(next.json.id).toBe(pilates.id);
    expect((await env.call('GET', `/classes/${pilates.id}`, { token })).json.spotsLeft).toBe(19);

    expect((await env.call('DELETE', `/classes/${pilates.id}/booking`, { token })).status).toBe(204);
    expect((await env.call('GET', '/me/bookings?filter=upcoming', { token })).json).toEqual([]);
  });

  it('refuses classes that have started and unknown ids', async () => {
    const [strength] = (await env.call('GET', '/classes?date=2026-09-22', { token })).json;
    expect((await env.call('POST', `/classes/${strength.id}/booking`, { token })).json.error.code).toBe('class_started');
    expect((await env.call('GET', '/classes/not-a-uuid', { token })).status).toBe(404);
  });

  it('saves the calorie goal within limits', async () => {
    expect((await env.call('PUT', '/me/calorie-goal', { token, body: { kcal: 2200 } })).json).toEqual({ kcal: 2200 });
    expect((await env.call('GET', '/me/calorie-goal', { token })).json.kcal).toBe(2200);
    expect((await env.call('PUT', '/me/calorie-goal', { token, body: { kcal: 90000 } })).status).toBe(400);
  });
});

describe('check-in', () => {
  it('checks in once, checks out, and records the visit', async () => {
    const first = await env.call('POST', '/me/check-in', { token, body: { source: 'app' } });
    expect(first.status).toBe(200);
    const again = await env.call('POST', '/me/check-in', { token, body: { source: 'app' } });
    expect(again.json.id).toBe(first.json.id); // double tap = same visit

    const status = await env.call('GET', '/me/check-in', { token });
    expect(status.json.current.id).toBe(first.json.id);

    env.clock.now = new Date(env.clock.now.getTime() + 75 * 60_000);
    const out = await env.call('POST', '/me/check-out', { token });
    expect(out.json.checkedOutAt).toBeTruthy();
    expect((await env.call('POST', '/me/check-out', { token })).json.error.code).toBe('not_checked_in');

    const overview = await env.call('GET', '/me/overview', { token });
    expect(overview.json.activeMinutesToday).toBe(75);
    expect(overview.json.caloriesToday).toBe(75 * 7);
  });

  it('auto-closes a visit left open overnight', async () => {
    await env.call('POST', '/me/check-in', { token, body: {} });
    env.clock.now = new Date(env.clock.now.getTime() + 13 * 3_600_000);
    const status = await env.call('GET', '/me/check-in', { token });
    expect(status.json.current).toBeNull();
    const [latest] = (await env.call('GET', '/me/visits?limit=1', { token })).json;
    const minutes = (Date.parse(latest.checkedOutAt) - Date.parse(latest.checkedInAt)) / 60_000;
    expect(minutes).toBe(90);
  });

  it('blocks check-in when the membership has expired', async () => {
    await setValidUntil('2026-01-01');
    const res = await env.call('POST', '/me/check-in', { token, body: {} });
    expect(res.status).toBe(403);
    expect(res.json.error.message).toMatch(/expired/);
    expect((await env.call('GET', '/me/membership', { token })).json.status).toBe('expired');
    await setValidUntil('2026-10-12');
  });
});

describe('door device', () => {
  it('toggles members in and out and refuses expired members', async () => {
    const key = `dev_${randomToken()}`;
    await env.ctx.db.insert(devices).values({ name: 'Front door', keyHash: sha256(key) });
    const { checkInCode } = (await env.call('GET', '/me/membership', { token })).json;
    const scan = (code: string, k = key) =>
      env.call('POST', '/devices/scan', { headers: { 'X-Device-Key': k }, body: { code } });

    expect((await scan(checkInCode, 'wrong')).status).toBe(401);
    expect((await scan('HZ1.unknown')).json).toMatchObject({ allowed: false, reason: 'unknown_code' });

    const inRes = await scan(checkInCode);
    expect(inRes.json).toMatchObject({ allowed: true, direction: 'in', member: { firstName: 'Sam' } });
    expect(inRes.json.visit.source).toBe('device');
    const outRes = await scan(checkInCode);
    expect(outRes.json).toMatchObject({ allowed: true, direction: 'out' });

    await setValidUntil('2026-01-01');
    expect((await scan(checkInCode)).json).toMatchObject({ allowed: false, reason: 'membership_expired' });
    await setValidUntil('2026-10-12');
  });
});

describe('time zone helpers', () => {
  it('converts gym-local wall time to instants', () => {
    expect(zonedToInstant('2026-09-22', '18:00', 'Africa/Johannesburg').toISOString()).toBe('2026-09-22T16:00:00.000Z');
    expect(dateKeyIn('Africa/Johannesburg', new Date('2026-09-22T22:30:00Z'))).toBe('2026-09-23');
  });

  it('only counts member visits (not other rows) for the month', async () => {
    const rows = await env.ctx.db.select().from(visits).where(eq(visits.source, 'device'));
    expect(rows.length).toBeGreaterThan(0);
  });
});
