import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { migrate as migrateNodePg } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import pg from 'pg';

import * as schema from './schema.js';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface Database {
  db: Db;
  migrate(): Promise<void>;
  close(): Promise<void>;
}

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

/**
 * Production: a normal Postgres server via DATABASE_URL.
 * Development/tests: PGlite (Postgres compiled to WebAssembly) stored in a
 * folder — or in memory when dataDir is "memory".
 */
export function createDatabase(opts: { databaseUrl?: string; dataDir?: string }): Database {
  if (opts.databaseUrl) {
    const pool = new pg.Pool({ connectionString: opts.databaseUrl });
    const db = drizzleNodePg(pool, { schema });
    return {
      db: db as unknown as Db,
      migrate: () => migrateNodePg(db, { migrationsFolder }),
      close: () => pool.end(),
    };
  }
  const dir = opts.dataDir ?? 'memory';
  if (dir !== 'memory') mkdirSync(dir, { recursive: true });
  const client = dir === 'memory' ? new PGlite() : new PGlite(dir);
  const db = drizzlePglite(client, { schema });
  return {
    db: db as unknown as Db,
    migrate: () => migratePglite(db, { migrationsFolder }),
    close: () => client.close(),
  };
}
