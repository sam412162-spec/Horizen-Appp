import { devices } from '../db/schema.js';
import { randomToken, sha256 } from '../lib/crypto.js';
import { bootstrap } from './bootstrap.js';

/** Register a door scanner: `npm run device:create -- "Front door" [toggle|in|out]`. Prints the key once. */
const [name = 'Front door', mode = 'toggle'] = process.argv.slice(2);
if (!['toggle', 'in', 'out'].includes(mode)) throw new Error('mode must be toggle, in or out');
const { ctx, close } = await bootstrap();
const key = `dev_${randomToken(24)}`;
await ctx.db.insert(devices).values({ name, keyHash: sha256(key), mode: mode as 'toggle' | 'in' | 'out' });
console.log(`Device "${name}" created (mode: ${mode}).\nDevice key (shown once, store it on the device):\n\n  ${key}\n`);
await close();
