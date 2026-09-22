/**
 * Gym-local date helpers. Dates the gym thinks in ("today", "the 5th", "06:00")
 * are converted to exact instants using the configured IANA time zone.
 */

/** "YYYY-MM-DD" of `instant` in `tz`. */
export function dateKeyIn(tz: string, instant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    instant,
  );
}

/** Minutes the zone is ahead of UTC at `instant`. */
function offsetMinutes(tz: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/** The instant at wall-clock `time` ("HH:mm") on `dateKey` in `tz`. */
export function zonedToInstant(dateKey: string, time: string, tz: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wall - offsetMinutes(tz, new Date(wall)) * 60_000;
  guess = wall - offsetMinutes(tz, new Date(guess)) * 60_000; // settle around DST changes
  return new Date(guess);
}

/** [start, end) of the gym-local day. */
export function dayRange(dateKey: string, tz: string): [Date, Date] {
  return [zonedToInstant(dateKey, '00:00', tz), zonedToInstant(addDaysKey(dateKey, 1), '00:00', tz)];
}

export function addDaysKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addIntervalKey(dateKey: string, interval: 'month' | 'year'): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  if (interval === 'year') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

/** Monday of the week containing dateKey. */
export function startOfWeekKey(dateKey: string): string {
  return addDaysKey(dateKey, -((weekdayOf(dateKey) + 6) % 7));
}

export const maxKey = (a: string, b: string) => (a > b ? a : b);
