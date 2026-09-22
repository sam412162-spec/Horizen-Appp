import { bootstrap } from './bootstrap.js';

const { close } = await bootstrap();
console.log('Migrations applied.');
await close();
