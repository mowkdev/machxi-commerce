/**
 * Product / variant / pricing / inventory creation for the demo seeder.
 *
 * Each product upserts translations for all demo locales, attaches an
 * Unsplash product-level image, connects to its categories, and either:
 *   - simple:   one variant, one inventory item, levels per stock location.
 *   - variable: one variant per cartesian combo of (color × size). Color
 *               variants get a shared swatch image; size-only variants reuse
 *               the product-level image.
 *
 * Prices are seeded for both EUR (base) and USD (derived via EUR_TO_USD).
 */

import { eq } from 'drizzle-orm';
import {
  inventoryItems,
  inventoryLevels,
  prices,
  priceSets,
  productCategories,
  productMedia,
  productOptionValues,
  productOptions,
  products,
  productTranslations,
  productVariants,
  variantMedia,
  variantOptionValues,
} from '../../src/schema';
import {
  COLOR_LABELS,
  COLOR_UNSPLASH,
  EUR_TO_USD,
  LANGUAGE_SPECS,
  SIZE_LABELS,
  type ProductSpec,
} from './data';
import { upsertMedia } from './media';
import type { Db, OptionCatalog } from './types';

const DEMO_LANGUAGE_CODES = LANGUAGE_SPECS.map((l) => l.code);
const DEFAULT_LANGUAGE_CODE = LANGUAGE_SPECS.find((l) => l.isDefault)?.code ?? 'en';

// ─────────────────────────────────────────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────────────────────────────────────────

async function createPriceSet(db: Db, eurAmount: number): Promise<string> {
  const usdAmount = Math.round(eurAmount * EUR_TO_USD);
  const [set] = await db.insert(priceSets).values({}).returning({ id: priceSets.id });
  await db.insert(prices).values([
    { priceSetId: set.id, currencyCode: 'EUR', amount: eurAmount, minQuantity: 1, taxInclusive: true },
    { priceSetId: set.id, currencyCode: 'USD', amount: usdAmount, minQuantity: 1, taxInclusive: false },
  ]);
  return set.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic stock quantity per SKU + location. Re-runs produce identical
 * numbers, which keeps demo data stable across re-seeds.
 *
 *   Location 0 (Main Warehouse): mostly 20-120 units, ~15% low (1-8), ~5% zero.
 *   Location 1 (Retail Store):   mostly 5-25 units,  ~10% low (1-4), ~10% zero.
 */
function stockFor(sku: string, locationIndex: number): number {
  let h = 0;
  for (const c of sku) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  const abs = Math.abs(h);

  if (locationIndex === 0) {
    const bucket = abs % 20;
    if (bucket === 0) return 0;                         // 5%  out of stock
    if (bucket <= 3) return ((abs >> 4) % 8) + 1;       // 15% low (1-8)
    return ((abs >> 6) % 101) + 20;                     // 80% normal (20-120)
  }

  const bucket = abs % 10;
  if (bucket === 0) return 0;                           // 10% zero
  if (bucket === 1) return ((abs >> 3) % 4) + 1;        // 10% low (1-4)
  return ((abs >> 5) % 21) + 5;                         // 80% normal (5-25)
}

async function ensureInventoryItem(db: Db, sku: string): Promise<string> {
  const [created] = await db
    .insert(inventoryItems)
    .values({ skuReference: sku })
    .returning({ id: inventoryItems.id });
  return created.id;
}

async function writeInventoryLevels(
  db: Db,
  inventoryItemId: string,
  sku: string,
  locationIds: readonly string[]
): Promise<void> {
  for (let i = 0; i < locationIds.length; i++) {
    await db
      .insert(inventoryLevels)
      .values({
        inventoryItemId,
        locationId: locationIds[i],
        stockedQuantity: stockFor(sku, i),
      })
      .onConflictDoNothing();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIANT MATH
// ─────────────────────────────────────────────────────────────────────────────

function cartesian<T>(sets: readonly T[][]): T[][] {
  if (sets.length === 0) return [[]];
  const [first, ...rest] = sets;
  return first.flatMap((item) => cartesian(rest).map((combo) => [item, ...combo]));
}

interface VariantDimension {
  optionCode: 'color' | 'size';
  valueCodes: string[];
  /** productOptionValues.id keyed by valueCode. */
  assignmentIdByCode: Map<string, string>;
}

async function ensureProductOptionDimension(
  db: Db,
  productId: string,
  optionId: string,
  rank: number,
  optionCode: 'color' | 'size',
  valueCodes: readonly string[],
  globalValueIds: Map<string, string>
): Promise<VariantDimension> {
  const [productOption] = await db
    .insert(productOptions)
    .values({ productId, optionId, rank })
    .onConflictDoUpdate({
      target: [productOptions.productId, productOptions.optionId],
      set: { rank },
    })
    .returning({ id: productOptions.id });

  const assignmentIdByCode = new Map<string, string>();
  for (let i = 0; i < valueCodes.length; i++) {
    const code = valueCodes[i];
    const globalValueId = globalValueIds.get(code);
    if (!globalValueId) {
      throw new Error(`Unknown ${optionCode} value "${code}" — not in global option catalog.`);
    }
    const [assignment] = await db
      .insert(productOptionValues)
      .values({ productOptionId: productOption.id, optionValueId: globalValueId, rank: i })
      .onConflictDoUpdate({
        target: [productOptionValues.productOptionId, productOptionValues.optionValueId],
        set: { rank: i },
      })
      .returning({ id: productOptionValues.id });
    assignmentIdByCode.set(code, assignment.id);
  }

  return { optionCode, valueCodes: [...valueCodes], assignmentIdByCode };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT
// ─────────────────────────────────────────────────────────────────────────────

interface SeedProductDeps {
  taxClassId: string;
  options: OptionCatalog;
  categoryIds: ReadonlyMap<string, string>;
  locationIds: readonly string[];
}

export async function seedProduct(
  db: Db,
  spec: ProductSpec,
  deps: SeedProductDeps
): Promise<void> {
  const isVariable = !!(spec.colors?.length || spec.sizes?.length);

  // ── Upsert product ─────────────────────────────────────────────────────────
  // uk_products_base_sku is a partial unique index (WHERE status != 'deleted'),
  // so ON CONFLICT (column) is not valid — check for existence first.
  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.baseSku, spec.sku))
    .limit(1);

  const product =
    existing ??
    (await db
      .insert(products)
      .values({
        baseSku: spec.sku,
        status: 'published',
        type: isVariable ? 'variable' : 'simple',
        taxClassId: deps.taxClassId,
      })
      .returning({ id: products.id }))[0];

  // ── Translations ───────────────────────────────────────────────────────────
  for (const lang of DEMO_LANGUAGE_CODES) {
    const t = spec.translations[lang] ?? spec.translations[DEFAULT_LANGUAGE_CODE];
    if (!t) continue;
    await db
      .insert(productTranslations)
      .values({
        productId: product.id,
        languageCode: lang,
        name: t.name,
        description: t.description,
        handle: spec.handle,
      })
      .onConflictDoNothing();
  }

  // ── Product-level media ────────────────────────────────────────────────────
  const defaultName = (spec.translations[DEFAULT_LANGUAGE_CODE] ?? Object.values(spec.translations)[0]).name;
  const productMediaId = await upsertMedia(db, {
    storageKey: `seed/products/${spec.sku.toLowerCase()}/main.jpg`,
    unsplashId: spec.unsplashId,
    fileName: `${spec.handle}-main.jpg`,
    altText: defaultName,
  });
  await db
    .insert(productMedia)
    .values({ productId: product.id, mediaId: productMediaId, rank: 0 })
    .onConflictDoNothing();

  // ── Categories ─────────────────────────────────────────────────────────────
  for (const handle of spec.categoryHandles) {
    const catId = deps.categoryIds.get(handle);
    if (!catId) {
      throw new Error(`Product "${spec.sku}" references unknown category "${handle}".`);
    }
    await db
      .insert(productCategories)
      .values({ productId: product.id, categoryId: catId })
      .onConflictDoNothing();
  }

  // ── Simple product → single variant ────────────────────────────────────────
  if (!isVariable) {
    const priceSetId = await createPriceSet(db, spec.amount);
    const inventoryItemId = await ensureInventoryItem(db, spec.sku);
    await db.insert(productVariants).values({
      productId: product.id,
      sku: spec.sku,
      status: 'published',
      priceSetId,
      inventoryItemId,
    });
    await writeInventoryLevels(db, inventoryItemId, spec.sku, deps.locationIds);
    return;
  }

  // ── Variable product → cartesian of dimensions ─────────────────────────────
  const dimensions: VariantDimension[] = [];

  if (spec.colors?.length) {
    dimensions.push(
      await ensureProductOptionDimension(
        db,
        product.id,
        deps.options.colorOptionId,
        0,
        'color',
        spec.colors,
        deps.options.colorValueIds
      )
    );
  }

  if (spec.sizes?.length) {
    dimensions.push(
      await ensureProductOptionDimension(
        db,
        product.id,
        deps.options.sizeOptionId,
        dimensions.length,
        'size',
        spec.sizes,
        deps.options.sizeValueIds
      )
    );
  }

  const colorIndex = dimensions.findIndex((d) => d.optionCode === 'color');
  const sizeIndex = dimensions.findIndex((d) => d.optionCode === 'size');

  for (const combo of cartesian(dimensions.map((d) => d.valueCodes))) {
    const colorCode = colorIndex >= 0 ? combo[colorIndex] : null;
    const sizeCode = sizeIndex >= 0 ? combo[sizeIndex] : null;

    const variantSku = `${spec.sku}-${combo.map((code) => code.toUpperCase()).join('-')}`;
    const priceSetId = await createPriceSet(db, spec.amount);
    const inventoryItemId = await ensureInventoryItem(db, variantSku);

    const [variant] = await db
      .insert(productVariants)
      .values({
        productId: product.id,
        sku: variantSku,
        status: 'published',
        priceSetId,
        inventoryItemId,
      })
      .returning({ id: productVariants.id });

    for (let i = 0; i < dimensions.length; i++) {
      const assignmentId = dimensions[i].assignmentIdByCode.get(combo[i]);
      if (!assignmentId) {
        throw new Error(`Missing option assignment for ${dimensions[i].optionCode}=${combo[i]}.`);
      }
      await db
        .insert(variantOptionValues)
        .values({ variantId: variant.id, valueId: assignmentId })
        .onConflictDoNothing();
    }

    await writeInventoryLevels(db, inventoryItemId, variantSku, deps.locationIds);

    // Color variants get a shared swatch image. Size-only variants reuse
    // the product-level image — no per-variant row needed.
    if (colorCode && COLOR_UNSPLASH[colorCode] !== undefined) {
      const colorLabels = COLOR_LABELS[colorCode];
      const colorLabel = colorLabels?.[DEFAULT_LANGUAGE_CODE] ?? colorCode;
      const sizeSuffix = sizeCode
        ? ` / ${SIZE_LABELS[sizeCode]?.[DEFAULT_LANGUAGE_CODE] ?? sizeCode}`
        : '';
      const colorMediaId = await upsertMedia(db, {
        storageKey: `seed/colors/${colorCode}/800x800.jpg`,
        unsplashId: COLOR_UNSPLASH[colorCode],
        fileName: `color-${colorCode}.jpg`,
        altText: `${defaultName} — ${colorLabel}${sizeSuffix}`,
      });
      await db
        .insert(variantMedia)
        .values({ variantId: variant.id, mediaId: colorMediaId, rank: 0 })
        .onConflictDoNothing();
    }
  }
}
