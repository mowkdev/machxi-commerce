/**
 * Seeds the demo dataset: languages (en default + lv), currencies (EUR default
 * + USD), tax class, options, categories, stock locations, products, variants,
 * pricing, inventory, and media.
 *
 * Idempotent — safe to re-run. Use `pnpm db:reset-demo` to wipe demo catalog
 * data first if you want a clean slate.
 *
 * Note: this is one of two currency seeders. `db:seed-currencies` seeds the
 * full ISO-4217 set used by `db:init`; this script only ensures the demo's
 * EUR + USD subset and is independent of that script.
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';
import { CURRENCY_SPECS, LANGUAGE_SPECS, PRODUCT_SPECS, STOCK_LOCATION_SPECS } from './seed/data';
import {
  ensureTaxClass,
  seedCategories,
  seedCurrencies,
  seedLanguages,
  seedOptions,
  seedStockLocations,
} from './seed/foundations';
import { seedProduct } from './seed/products';

let closeDatabase: () => Promise<void> = async () => {};

async function main(): Promise<void> {
  config({ path: resolve(__dirname, '../../../.env') });

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set. Check your .env file.');
    process.exit(1);
  }

  // Loaded after dotenv: client.ts reads DATABASE_URL at module init.
  const { db, closeDatabase: closeDb } = await import('../src/client');
  closeDatabase = closeDb;

  await seedLanguages(db);
  await seedCurrencies(db);
  const taxClassId = await ensureTaxClass(db);
  const options = await seedOptions(db);
  const categoryIds = await seedCategories(db);
  const locationIds = await seedStockLocations(db);

  console.log(`Languages:        ${LANGUAGE_SPECS.map((l) => l.code).join(', ')} (default: ${LANGUAGE_SPECS.find((l) => l.isDefault)?.code})`);
  console.log(`Currencies:       ${CURRENCY_SPECS.map((c) => c.code).join(', ')} (default: ${CURRENCY_SPECS.find((c) => c.isDefault)?.code})`);
  console.log(`Stock locations:  ${STOCK_LOCATION_SPECS.map((l) => l.name).join(', ')}`);
  console.log(`Categories:       ${categoryIds.size}`);
  console.log(`\nSeeding ${PRODUCT_SPECS.length} products...`);

  for (const spec of PRODUCT_SPECS) {
    await seedProduct(db, spec, { taxClassId, options, categoryIds, locationIds });
    console.log(`  ✓ ${spec.sku}  ${spec.name}`);
  }

  const simpleCount = PRODUCT_SPECS.filter((p) => !p.colors?.length && !p.sizes?.length).length;
  const variableCount = PRODUCT_SPECS.length - simpleCount;
  console.log(
    `\nDone. ${simpleCount} simple, ${variableCount} variable products across ` +
    `${categoryIds.size} categories, stocked at ${locationIds.length} locations.`
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
