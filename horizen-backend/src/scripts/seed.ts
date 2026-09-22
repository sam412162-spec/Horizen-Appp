import { SAMPLE_ADMIN, SAMPLE_MEMBER, seed } from '../seed.js';
import { bootstrap } from './bootstrap.js';

const { ctx, close } = await bootstrap();
const result = await seed(ctx);
if (result.skipped) console.log('Database already has data — seed skipped.');
else {
  console.log('Seeded sample data.');
  console.log(`  Member login: ${SAMPLE_MEMBER.email} / ${SAMPLE_MEMBER.password}`);
  console.log(`  Admin login:  ${SAMPLE_ADMIN.email} / ${SAMPLE_ADMIN.password}  (change this before going live)`);
}
await close();
