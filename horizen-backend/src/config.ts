/** All configuration comes from environment variables (see .env.example). */
export interface Config {
  port: number;
  /** postgres://… in production. Empty = embedded PGlite database in DATA_DIR (development). */
  databaseUrl: string;
  dataDir: string;
  /** Public base URL of this API, used for Paystack's return page. */
  publicUrl: string;
  timeZone: string;
  currency: string;
  paystackSecretKey: string;
  /** Deep-link prefixes the app may ask to be sent back to after payment. */
  allowedReturnUrlPrefixes: string[];
  sessionDays: number;
  /** Run background jobs (session generation, billing, visit auto-close) in this process. */
  runJobs: boolean;
  corsOrigins: string[];
}

const list = (v: string | undefined, fallback: string[]) =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : fallback;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    databaseUrl: env.DATABASE_URL ?? '',
    dataDir: env.DATA_DIR ?? '.data/pglite',
    publicUrl: (env.PUBLIC_URL ?? `http://localhost:${env.PORT ?? 3000}`).replace(/\/$/, ''),
    timeZone: env.GYM_TIME_ZONE ?? 'Africa/Johannesburg',
    currency: env.CURRENCY ?? 'ZAR',
    paystackSecretKey: env.PAYSTACK_SECRET_KEY ?? '',
    allowedReturnUrlPrefixes: list(env.ALLOWED_RETURN_URL_PREFIXES, ['horizen://', 'exp://', 'exps://']),
    sessionDays: Number(env.SESSION_DAYS ?? 90),
    runJobs: (env.RUN_JOBS ?? 'true') !== 'false',
    corsOrigins: list(env.CORS_ORIGINS, []),
  };
}
