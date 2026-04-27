import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../../../../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required — run `docker compose up -d && pnpm db:setup` first');
}
