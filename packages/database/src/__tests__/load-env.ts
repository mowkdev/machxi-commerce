import { config } from 'dotenv';
import { resolve } from 'node:path';

// Integration tests connect to the dev Postgres the same way the app does.
// Every test wraps its work in a transaction and rolls back, so the DB stays clean.
config({ path: resolve(__dirname, '../../../../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required — run `docker compose up -d && pnpm db:setup` first');
}
