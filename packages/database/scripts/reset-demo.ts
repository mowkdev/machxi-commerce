/**
 * Wipes the demo catalog (products, categories, options, demo media,
 * orphan price/inventory rows). Auth, currencies, languages, tax classes,
 * stock locations and shared pricing surfaces (shipping, price lists) are
 * preserved.
 *
 * Run only against disposable development/test databases.
 */

import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';

async function main(): Promise<void> {
  config({ path: resolve(__dirname, '../../../.env') });

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL is not set. Check your .env file.');
    process.exit(1);
  }

  const sql = await readFile(resolve(__dirname, '../sql/reset-demo.sql'), 'utf8');
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }

  console.log('Demo catalog reset completed.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
