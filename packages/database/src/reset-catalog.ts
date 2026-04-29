import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';

async function main(): Promise<void> {
  config({ path: resolve(process.cwd(), '../../.env') });

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL is not set. Check your .env file.');
    process.exit(1);
  }

  const sql = await readFile(resolve(process.cwd(), 'scripts/reset-catalog.sql'), 'utf8');
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }

  console.log('Catalog reset completed.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
