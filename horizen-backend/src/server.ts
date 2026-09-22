import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';

import { createApp } from './app.js';
import { loadConfig } from './config.js';
import type { Ctx } from './context.js';
import { createDatabase } from './db/client.js';
import { startScheduler } from './jobs.js';
import { createPaystackClient } from './paystack.js';

const config = loadConfig();
const database = createDatabase({ databaseUrl: config.databaseUrl, dataDir: config.dataDir });
await database.migrate();

const ctx: Ctx = {
  db: database.db,
  config,
  paystack: createPaystackClient(config.paystackSecretKey),
  now: () => new Date(),
};

const app = createApp(ctx);
// Class, coach and workout photos (upload your own into public/images).
app.use('/images/*', serveStatic({ root: './public' }));

if (config.runJobs) startScheduler(ctx);
if (!config.paystackSecretKey) console.warn('[warn] PAYSTACK_SECRET_KEY is not set — payments will fail.');

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Horizen API listening on http://localhost:${info.port} (${config.databaseUrl ? 'Postgres' : 'PGlite ' + config.dataDir})`);
});
