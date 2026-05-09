/**
 * Foundation rows the demo catalog depends on:
 *   - languages (en default, lv)
 *   - currencies (EUR default, USD)
 *   - tax class (single "Standard")
 *   - option definitions + values (color, size) with translations for all demo locales
 *   - categories with translations for all demo locales
 *   - stock locations
 *   - store settings (company details for invoicing)
 *   - shipping options (required for checkout)
 *
 * All operations are idempotent and safe to re-run.
 */

import { and, eq, sql } from 'drizzle-orm';
import {
  categories,
  categoryTranslations,
  currencies,
  languages,
  optionDefinitions,
  optionDefinitionTranslations,
  optionValues,
  optionValueTranslations,
  prices,
  priceSets,
  shippingOptions,
  stockLocations,
  storeSettings,
  taxClasses,
} from '../../src/schema';
import {
  CATEGORY_SPECS,
  COLOR_LABELS,
  COLOR_UNSPLASH,
  CURRENCY_SPECS,
  EUR_TO_USD,
  LANGUAGE_SPECS,
  OPTION_NAMES,
  SHIPPING_OPTION_SPECS,
  SIZE_LABELS,
  STOCK_LOCATION_SPECS,
  STORE_SETTINGS_SPEC,
  type CategorySpec,
} from './data';
import type { Db, OptionCatalog } from './types';

const DEMO_LANGUAGE_CODES = LANGUAGE_SPECS.map((l) => l.code);
const DEFAULT_LANGUAGE_CODE = LANGUAGE_SPECS.find((l) => l.isDefault)?.code ?? 'en';

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Seeds demo languages. Sets `is_default = true` on exactly one row,
 * matching `LANGUAGE_SPECS`. Honors the `uk_languages_single_default`
 * partial unique index by setting via a single UPDATE at the end.
 */
export async function seedLanguages(db: Db): Promise<void> {
  for (const spec of LANGUAGE_SPECS) {
    await db
      .insert(languages)
      .values({ code: spec.code, name: spec.name, isDefault: false })
      .onConflictDoNothing({ target: languages.code });
  }

  const defaultSpec = LANGUAGE_SPECS.find((l) => l.isDefault);
  if (!defaultSpec) return;

  await db.execute(sql`
    UPDATE languages SET is_default = (code = ${defaultSpec.code})
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Seeds demo currencies. The default is enforced post-insert so the
 * `uk_currencies_single_default` partial unique index is never violated when
 * re-running on top of operator edits or on top of `seed-currencies.ts`.
 */
export async function seedCurrencies(db: Db): Promise<void> {
  for (const spec of CURRENCY_SPECS) {
    await db
      .insert(currencies)
      .values({
        code: spec.code,
        name: spec.name,
        symbol: spec.symbol,
        decimalDigits: spec.decimalDigits,
        isActive: true,
        isDefault: false,
        displayOrder: spec.displayOrder,
      })
      .onConflictDoNothing({ target: currencies.code });
  }

  const defaultSpec = CURRENCY_SPECS.find((c) => c.isDefault);
  if (!defaultSpec) return;

  await db.execute(sql`
    UPDATE currencies
    SET
      is_default = (code = ${defaultSpec.code}),
      is_active  = is_active OR (code = ${defaultSpec.code})
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// TAX
// ─────────────────────────────────────────────────────────────────────────────

export async function ensureTaxClass(db: Db): Promise<string> {
  const [existing] = await db.select({ id: taxClasses.id }).from(taxClasses).limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(taxClasses)
    .values({ name: 'Standard' })
    .returning({ id: taxClasses.id });
  return created.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function upsertOption(db: Db, code: string): Promise<string> {
  const [row] = await db
    .insert(optionDefinitions)
    .values({ code })
    .onConflictDoUpdate({ target: optionDefinitions.code, set: { code } })
    .returning({ id: optionDefinitions.id });
  return row.id;
}

async function upsertOptionLabels(db: Db, optionId: string, optionCode: string): Promise<void> {
  const namesByLang = OPTION_NAMES[optionCode] ?? {};
  for (const lang of DEMO_LANGUAGE_CODES) {
    const name = namesByLang[lang] ?? namesByLang[DEFAULT_LANGUAGE_CODE];
    if (!name) continue;
    await db
      .insert(optionDefinitionTranslations)
      .values({ optionId, languageCode: lang, name })
      .onConflictDoNothing();
  }
}

async function upsertOptionValue(
  db: Db,
  optionId: string,
  code: string,
  labelsByLang: Record<string, string>
): Promise<string> {
  const [row] = await db
    .insert(optionValues)
    .values({ optionId, code })
    .onConflictDoUpdate({
      target: [optionValues.optionId, optionValues.code],
      set: { code },
    })
    .returning({ id: optionValues.id });

  for (const lang of DEMO_LANGUAGE_CODES) {
    const label = labelsByLang[lang] ?? labelsByLang[DEFAULT_LANGUAGE_CODE];
    if (!label) continue;
    await db
      .insert(optionValueTranslations)
      .values({ valueId: row.id, languageCode: lang, label })
      .onConflictDoNothing();
  }

  return row.id;
}

export async function seedOptions(db: Db): Promise<OptionCatalog> {
  const colorOptionId = await upsertOption(db, 'color');
  await upsertOptionLabels(db, colorOptionId, 'color');
  const colorValueIds = new Map<string, string>();
  for (const [code, labelsByLang] of Object.entries(COLOR_LABELS)) {
    colorValueIds.set(code, await upsertOptionValue(db, colorOptionId, code, labelsByLang));
  }

  const sizeOptionId = await upsertOption(db, 'size');
  await upsertOptionLabels(db, sizeOptionId, 'size');
  const sizeValueIds = new Map<string, string>();
  for (const [code, labelsByLang] of Object.entries(SIZE_LABELS)) {
    sizeValueIds.set(code, await upsertOptionValue(db, sizeOptionId, code, labelsByLang));
  }

  return { colorOptionId, sizeOptionId, colorValueIds, sizeValueIds };
}

// Keep COLOR_UNSPLASH accessible for products.ts via a re-export.
export { COLOR_UNSPLASH };

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

async function upsertCategory(
  db: Db,
  spec: CategorySpec,
  parentId: string | null
): Promise<string> {
  // Use the default-language handle as the existence key.
  const [existing] = await db
    .select({ categoryId: categoryTranslations.categoryId })
    .from(categoryTranslations)
    .where(
      and(
        eq(categoryTranslations.handle, spec.handle),
        eq(categoryTranslations.languageCode, DEFAULT_LANGUAGE_CODE)
      )
    )
    .limit(1);

  let categoryId: string;

  if (existing) {
    categoryId = existing.categoryId;
  } else {
    const [cat] = await db
      .insert(categories)
      .values({ parentId, isActive: true, rank: spec.rank })
      .returning({ id: categories.id });
    categoryId = cat.id;
  }

  // Upsert translations for every demo language.
  for (const lang of DEMO_LANGUAGE_CODES) {
    const name = spec.names[lang] ?? spec.names[DEFAULT_LANGUAGE_CODE];
    if (!name) continue;
    await db
      .insert(categoryTranslations)
      .values({ categoryId, languageCode: lang, name, handle: spec.handle })
      .onConflictDoNothing();
  }

  return categoryId;
}

export async function seedCategories(db: Db): Promise<Map<string, string>> {
  const handleToId = new Map<string, string>();

  // Roots first; child specs require their parent to already be in the map.
  for (const spec of CATEGORY_SPECS.filter((s) => !s.parentHandle)) {
    handleToId.set(spec.handle, await upsertCategory(db, spec, null));
  }
  for (const spec of CATEGORY_SPECS.filter((s) => s.parentHandle)) {
    const parentId = handleToId.get(spec.parentHandle!);
    if (!parentId) {
      throw new Error(
        `Category "${spec.handle}" references unknown parent "${spec.parentHandle}".`
      );
    }
    handleToId.set(spec.handle, await upsertCategory(db, spec, parentId));
  }

  return handleToId;
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK LOCATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function seedStockLocations(db: Db): Promise<string[]> {
  const ids: string[] = [];
  for (const spec of STOCK_LOCATION_SPECS) {
    const [existing] = await db
      .select({ id: stockLocations.id })
      .from(stockLocations)
      .where(eq(stockLocations.name, spec.name))
      .limit(1);

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const [created] = await db
      .insert(stockLocations)
      .values({ name: spec.name })
      .returning({ id: stockLocations.id });
    ids.push(created.id);
  }
  return ids;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

export async function seedStoreSettings(db: Db): Promise<void> {
  const [existing] = await db.select({ id: storeSettings.id }).from(storeSettings).limit(1);
  if (existing) return;

  await db.insert(storeSettings).values({
    companyName: STORE_SETTINGS_SPEC.companyName,
    addressStreet: STORE_SETTINGS_SPEC.addressStreet,
    addressCity: STORE_SETTINGS_SPEC.addressCity,
    addressZip: STORE_SETTINGS_SPEC.addressZip,
    addressCountry: STORE_SETTINGS_SPEC.addressCountry,
    taxId: STORE_SETTINGS_SPEC.taxId,
    vatNumber: STORE_SETTINGS_SPEC.vatNumber,
    bankName: STORE_SETTINGS_SPEC.bankName,
    iban: STORE_SETTINGS_SPEC.iban,
    bic: STORE_SETTINGS_SPEC.bic,
    accountHolder: STORE_SETTINGS_SPEC.accountHolder,
    invoicePrefix: STORE_SETTINGS_SPEC.invoicePrefix,
    invoiceFooterText: STORE_SETTINGS_SPEC.invoiceFooterText,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHIPPING OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function seedShippingOptions(db: Db, taxClassId: string): Promise<void> {
  for (const spec of SHIPPING_OPTION_SPECS) {
    const [existing] = await db
      .select({ id: shippingOptions.id })
      .from(shippingOptions)
      .where(eq(shippingOptions.name, spec.name))
      .limit(1);
    if (existing) continue;

    const [priceSet] = await db
      .insert(priceSets)
      .values({})
      .returning({ id: priceSets.id });

    await db.insert(shippingOptions).values({
      name: spec.name,
      priceSetId: priceSet.id,
      taxClassId,
    });

    for (const curr of CURRENCY_SPECS) {
      const amount = curr.code === 'EUR'
        ? spec.amount
        : Math.round(spec.amount * EUR_TO_USD);
      await db.insert(prices).values({
        priceSetId: priceSet.id,
        currencyCode: curr.code,
        amount,
        taxInclusive: true,
      });
    }
  }
}
