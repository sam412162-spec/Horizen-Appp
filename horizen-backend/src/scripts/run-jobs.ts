import { runAllJobs } from '../jobs.js';
import { bootstrap } from './bootstrap.js';

/** For hosts with an external scheduler (cron): `npm run jobs:run`, with RUN_JOBS=false on the web process. */
const { ctx, close } = await bootstrap();
console.log(await runAllJobs(ctx));
await close();
