import { loadConfig } from '../config.js';
import type { Ctx } from '../context.js';
import { createDatabase } from '../db/client.js';
import { createPaystackClient } from '../paystack.js';

/** Context for command-line scripts. Runs migrations first. */
export async function bootstrap() {
  const config = loadConfig();
  const database = createDatabase({ databaseUrl: config.databaseUrl, dataDir: config.dataDir });
  await database.migrate();
  const ctx: Ctx = { db: database.db, config, paystack: createPaystackClient(config.paystackSecretKey), now: () => new Date() };
  return { ctx, close: () => database.close() };
}
