/**
 * Seeds the currencies catalog (the source-of-truth for ISO-4217 codes used
 * across pricing, carts, orders, payments, and promotions).
 *
 * Idempotent — safe to re-run.
 *
 * Steps:
 *   1. Insert a base set (USD, EUR, GBP, JPY, CAD, AUD) with correct
 *      `decimal_digits`. ON CONFLICT DO NOTHING preserves any operator edits.
 *   2. Backfill: SELECT DISTINCT currency_code from every table that carries
 *      one; insert any missing codes with sensible defaults. Guarantees the
 *      `currencies.code` FK on those tables is satisfied even when the DB
 *      had data prior to currencies being introduced.
 *   3. Ensure exactly one default currency: configurable via `DEFAULT_CURRENCY`
 *      env var (defaults to `EUR`). All other rows are flipped to
 *      is_default = false to satisfy the single-default partial unique index.
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { currencies } from '../src/schema';

let closeDatabase: () => Promise<void> = async () => {};

interface BaseCurrency {
  code: string;
  name: string;
  symbol: string;
  decimalDigits: number;
  displayOrder: number;
}

const BASE_CURRENCIES: BaseCurrency[] = [
  { code: 'EUR', name: 'Euro',                   symbol: '€',  decimalDigits: 2, displayOrder: 10 },
  { code: 'USD', name: 'United States Dollar',   symbol: '$',  decimalDigits: 2, displayOrder: 20 },
  { code: 'GBP', name: 'British Pound Sterling', symbol: '£',  decimalDigits: 2, displayOrder: 30 },
  { code: 'JPY', name: 'Japanese Yen',           symbol: '¥',  decimalDigits: 0, displayOrder: 40 },
  { code: 'CAD', name: 'Canadian Dollar',        symbol: 'C$', decimalDigits: 2, displayOrder: 50 },
  { code: 'AUD', name: 'Australian Dollar',      symbol: 'A$', decimalDigits: 2, displayOrder: 60 },
];

async function main(): Promise<void> {
  config({ path: resolve(__dirname, '../../../.env') });

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set. Check your .env file.');
    process.exit(1);
  }

  const defaultCode = (process.env.DEFAULT_CURRENCY ?? 'EUR').toUpperCase();

  const { db, closeDatabase: closeDb } = await import('../src/client');
  closeDatabase = closeDb;

  // 1. Base set — never overwrites operator edits.
  for (const c of BASE_CURRENCIES) {
    await db
      .insert(currencies)
      .values({
        code: c.code,
        name: c.name,
        symbol: c.symbol,
        decimalDigits: c.decimalDigits,
        isActive: true,
        isDefault: false,
        displayOrder: c.displayOrder,
      })
      .onConflictDoNothing({ target: currencies.code });
  }

  // 2. Backfill from existing data. We UNION DISTINCT across all tables that
  //    carry a currency_code column. ON CONFLICT DO NOTHING means previously
  //    seeded rows keep their nice metadata; brand-new codes get the code
  //    duplicated as name/symbol — operators can edit these later via admin.
  await db.execute(sql`
    INSERT INTO currencies (code, name, symbol, decimal_digits, is_active, is_default, display_order)
    SELECT DISTINCT
      code,
      code AS name,
      code AS symbol,
      2 AS decimal_digits,
      true AS is_active,
      false AS is_default,
      999 AS display_order
    FROM (
      SELECT currency_code AS code FROM prices
      UNION SELECT currency_code FROM price_list_prices
      UNION SELECT currency_code FROM carts
      UNION SELECT currency_code FROM orders
      UNION SELECT currency_code FROM payments
      UNION SELECT currency_code FROM payment_transactions
      UNION SELECT currency_code FROM promotion_amounts
    ) AS observed
    WHERE code IS NOT NULL
    ON CONFLICT (code) DO NOTHING
  `);

  // 3. Ensure default is exactly one row, matching env.
  const targetResult = await db.execute<{ code: string }>(sql`
    SELECT code FROM currencies WHERE code = ${defaultCode} LIMIT 1
  `);
  if (targetResult.rows.length === 0) {
    console.error(
      `ERROR: DEFAULT_CURRENCY=${defaultCode} is not in the currencies table after seeding.`
    );
    process.exit(1);
  }

  await db.execute(sql`
    UPDATE currencies
    SET is_default = (code = ${defaultCode}), is_active = is_active OR (code = ${defaultCode})
  `);

  // Re-read for the friendly message.
  const summary = await db.execute<{ code: string; is_default: boolean }>(sql`
    SELECT code, is_default FROM currencies ORDER BY display_order, code
  `);
  const defaultRow = summary.rows.find((r) => r.is_default);
  console.log(
    `Currencies seeded (${summary.rows.length} rows). Default: ${defaultRow?.code ?? '<none>'}.`
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
