import type { Config } from './config.js';
import type { Db } from './db/client.js';
import type { PaystackClient } from './paystack.js';

/** Everything request handlers and jobs need. `now` is injectable for tests. */
export interface Ctx {
  db: Db;
  config: Config;
  paystack: PaystackClient;
  now(): Date;
}
