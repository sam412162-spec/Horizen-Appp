import type { Ctx } from './context.js';
import { runBilling } from './services/billing.js';
import { closeStaleVisits } from './services/checkin.js';
import { generateSessions } from './services/classes.js';

/** Everything that runs on a schedule. Safe to run repeatedly. */
export async function runAllJobs(ctx: Ctx) {
  const sessionsGenerated = await generateSessions(ctx, 14);
  await closeStaleVisits(ctx);
  const billing = await runBilling(ctx);
  return { sessionsGenerated, ...billing };
}

/** Run jobs now and then every `minutes` minutes (in-process scheduler). */
export function startScheduler(ctx: Ctx, minutes = 60) {
  const tick = () =>
    runAllJobs(ctx)
      .then((r) => console.log('[jobs]', JSON.stringify(r)))
      .catch((e) => console.error('[jobs] failed', e));
  void tick();
  const timer = setInterval(tick, minutes * 60_000);
  timer.unref();
  return () => clearInterval(timer);
}
