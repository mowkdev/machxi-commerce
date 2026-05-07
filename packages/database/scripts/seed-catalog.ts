/**
 * Seeds the product catalog: categories, media, options, products, variants.
 * Idempotent — safe to re-run. Use `pnpm db:reset-catalog` to wipe first.
 *
 * Media strategy:
 *   - Each product gets one product-level image (unique Picsum photo per product).
 *   - Color variants each get a shared color swatch image (same image for "red"
 *     across all products). The same media row is reused via storageKey upsert.
 *   - Size-only variants inherit the product-level image; no per-variant row needed.
 */

import { createHash } from 'node:crypto';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { and, eq } from 'drizzle-orm';
import {
  categories,
  categoryTranslations,
  inventoryItems,
  inventoryLevels,
  languages,
  media,
  optionDefinitions,
  optionDefinitionTranslations,
  optionValues,
  optionValueTranslations,
  prices,
  priceSets,
  productCategories,
  productMedia,
  productOptionValues,
  productOptions,
  products,
  productTranslations,
  productVariants,
  stockLocations,
  taxClasses,
  variantMedia,
  variantOptionValues,
} from '../src/schema';

// ─────────────────────────────────────────────────────────────────────────────
// DB TYPE ALIAS
// ─────────────────────────────────────────────────────────────────────────────

type Db = Awaited<typeof import('../src/client')>['db'];

let closeDatabase: () => Promise<void> = async () => {};

// ─────────────────────────────────────────────────────────────────────────────
// STATIC CATALOG DATA
// ─────────────────────────────────────────────────────────────────────────────

/** Picsum photo IDs used for color swatch images shared across all products. */
const COLOR_PICSUM: Record<string, number> = {
  red: 10,
  blue: 11,
  green: 12,
  black: 13,
  white: 14,
  gray: 15,
  navy: 16,
  burgundy: 17,
  tan: 18,
};

const COLOR_LABELS: Record<string, string> = {
  red: 'Red', blue: 'Blue', green: 'Green', black: 'Black', white: 'White',
  gray: 'Gray', navy: 'Navy', burgundy: 'Burgundy', tan: 'Tan',
};

const SIZE_LABELS: Record<string, string> = {
  xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL',
};

interface CategorySpec {
  handle: string;
  name: string;
  parentHandle?: string;
  rank: number;
}

const CATEGORY_SPECS: CategorySpec[] = [
  // Root categories
  { handle: 'apparel',      name: 'Apparel',            rank: 0 },
  { handle: 'accessories',  name: 'Accessories',         rank: 1 },
  { handle: 'drinkware',    name: 'Drinkware',           rank: 2 },
  { handle: 'home-living',  name: 'Home & Living',       rank: 3 },
  { handle: 'stationery',   name: 'Stationery',          rank: 4 },
  // Apparel children
  { handle: 'tshirts',          name: 'T-Shirts',             parentHandle: 'apparel',     rank: 0 },
  { handle: 'hoodies-sweats',   name: 'Hoodies & Sweatshirts',parentHandle: 'apparel',     rank: 1 },
  { handle: 'outerwear',        name: 'Outerwear',            parentHandle: 'apparel',     rank: 2 },
  { handle: 'bottoms',          name: 'Bottoms',              parentHandle: 'apparel',     rank: 3 },
  // Accessories children
  { handle: 'bags',    name: 'Bags & Totes', parentHandle: 'accessories', rank: 0 },
  { handle: 'hats',    name: 'Hats & Caps',  parentHandle: 'accessories', rank: 1 },
  { handle: 'socks',   name: 'Socks',        parentHandle: 'accessories', rank: 2 },
  // Drinkware children
  { handle: 'mugs',    name: 'Mugs',    parentHandle: 'drinkware', rank: 0 },
  { handle: 'bottles', name: 'Bottles', parentHandle: 'drinkware', rank: 1 },
];

interface ProductSpec {
  sku: string;
  name: string;
  description: string;
  handle: string;
  amount: number;
  picsumId: number;
  categoryHandles: string[];
  colors?: string[];
  sizes?: string[];
}

const PRODUCT_SPECS: ProductSpec[] = [
  // ── Simple products ──────────────────────────────────────────────────────
  {
    sku: 'SIMPLE-MUG',
    name: 'Ceramic Mug',
    description: 'A classic 11oz ceramic mug with a comfortable handle and vibrant print.',
    handle: 'ceramic-mug',
    amount: 1299,
    picsumId: 30,
    categoryHandles: ['drinkware', 'mugs'],
  },
  {
    sku: 'SIMPLE-ENAMEL-MUG',
    name: 'Enamel Camp Mug',
    description: 'Durable enamel mug built for the campfire. 12oz capacity, chip-resistant coating.',
    handle: 'enamel-camp-mug',
    amount: 1799,
    picsumId: 312,
    categoryHandles: ['drinkware', 'mugs'],
  },
  {
    sku: 'SIMPLE-TOTE',
    name: 'Canvas Tote Bag',
    description: 'Heavy-duty 12oz canvas tote with reinforced stitching. 15L capacity.',
    handle: 'canvas-tote-bag',
    amount: 1899,
    picsumId: 323,
    categoryHandles: ['accessories', 'bags'],
  },
  {
    sku: 'SIMPLE-DRAWSTRING',
    name: 'Drawstring Bag',
    description: 'Lightweight polyester drawstring bag. Perfect for gym and travel.',
    handle: 'drawstring-bag',
    amount: 999,
    picsumId: 334,
    categoryHandles: ['accessories', 'bags'],
  },
  {
    sku: 'SIMPLE-CAP',
    name: 'Classic Dad Cap',
    description: 'Unstructured cotton twill cap with a pre-curved brim. One size fits most.',
    handle: 'classic-dad-cap',
    amount: 2199,
    picsumId: 256,
    categoryHandles: ['accessories', 'hats'],
  },
  {
    sku: 'SIMPLE-BEANIE',
    name: 'Knit Beanie',
    description: 'Soft acrylic knit beanie with a folded cuff. One size fits most.',
    handle: 'knit-beanie',
    amount: 1699,
    picsumId: 307,
    categoryHandles: ['accessories', 'hats'],
  },
  {
    sku: 'SIMPLE-STICKERS',
    name: 'Sticker Pack',
    description: 'Set of 10 die-cut vinyl stickers. Weatherproof and dishwasher safe.',
    handle: 'sticker-pack',
    amount: 499,
    picsumId: 147,
    categoryHandles: ['home-living'],
  },
  {
    sku: 'SIMPLE-NOTEBOOK',
    name: 'Softcover Notebook A5',
    description: '120-page ruled softcover notebook in A5. Perfect for notes, sketches, and journaling.',
    handle: 'softcover-notebook-a5',
    amount: 1299,
    picsumId: 342,
    categoryHandles: ['stationery'],
  },
  {
    sku: 'SIMPLE-LAPTOP-SLEEVE',
    name: 'Laptop Sleeve 13"',
    description: 'Neoprene laptop sleeve fits most 13-inch laptops. Front pocket for accessories.',
    handle: 'laptop-sleeve-13',
    amount: 2999,
    picsumId: 386,
    categoryHandles: ['accessories'],
  },
  {
    sku: 'SIMPLE-PHONE-CASE',
    name: 'Snap Phone Case',
    description: 'Hard-shell snap case with a matte finish. Compatible with latest flagship models.',
    handle: 'snap-phone-case',
    amount: 1499,
    picsumId: 442,
    categoryHandles: ['accessories'],
  },
  // ── Variable products ────────────────────────────────────────────────────
  {
    sku: 'VAR-TEE',
    name: 'Classic T-Shirt',
    description: 'Unisex 100% combed ring-spun cotton tee. Preshrunk, side-seamed, tear-away label.',
    handle: 'classic-t-shirt',
    amount: 2499,
    picsumId: 325,
    categoryHandles: ['apparel', 'tshirts'],
    colors: ['red', 'blue', 'black', 'white'],
    sizes: ['s', 'm', 'l', 'xl'],
  },
  {
    sku: 'VAR-HOODIE',
    name: 'Zip-Up Hoodie',
    description: '80% cotton / 20% polyester fleece hoodie with full zip, kangaroo pockets, and rib cuffs.',
    handle: 'zip-up-hoodie',
    amount: 5999,
    picsumId: 374,
    categoryHandles: ['apparel', 'hoodies-sweats'],
    colors: ['black', 'white', 'gray'],
    sizes: ['s', 'm', 'l', 'xl'],
  },
  {
    sku: 'VAR-BOTTLE',
    name: 'Insulated Water Bottle',
    description: '500ml double-wall stainless steel bottle. Keeps drinks cold 24h, hot 12h.',
    handle: 'insulated-water-bottle',
    amount: 3499,
    picsumId: 395,
    categoryHandles: ['drinkware', 'bottles'],
    colors: ['red', 'green', 'blue'],
  },
  {
    sku: 'VAR-SWEATSHIRT',
    name: 'Crew Sweatshirt',
    description: 'Classic crew neck sweatshirt in 50/50 cotton-polyester blend. Pill-resistant fleece.',
    handle: 'crew-sweatshirt',
    amount: 4499,
    picsumId: 490,
    categoryHandles: ['apparel', 'hoodies-sweats'],
    colors: ['black', 'gray'],
    sizes: ['s', 'm', 'l', 'xl'],
  },
  {
    sku: 'VAR-JOGGERS',
    name: 'Jogger Pants',
    description: 'French terry joggers with tapered fit, elastic waistband, and zip pockets.',
    handle: 'jogger-pants',
    amount: 4999,
    picsumId: 494,
    categoryHandles: ['apparel', 'bottoms'],
    colors: ['black', 'gray'],
    sizes: ['s', 'm', 'l', 'xl'],
  },
  {
    sku: 'VAR-SWEATER',
    name: 'Knit Sweater',
    description: 'Fine-knit sweater in a relaxed fit. 100% merino wool. Machine washable.',
    handle: 'knit-sweater',
    amount: 7999,
    picsumId: 485,
    categoryHandles: ['apparel', 'hoodies-sweats'],
    colors: ['navy', 'burgundy'],
    sizes: ['m', 'l', 'xl'],
  },
  {
    sku: 'VAR-JACKET',
    name: 'Windbreaker Jacket',
    description: 'Lightweight nylon windbreaker with packable hood and zippered chest pocket.',
    handle: 'windbreaker-jacket',
    amount: 8999,
    picsumId: 480,
    categoryHandles: ['apparel', 'outerwear'],
    colors: ['black', 'navy'],
    sizes: ['s', 'm', 'l', 'xl'],
  },
  {
    sku: 'VAR-SOCKS',
    name: 'Athletic Crew Socks',
    description: 'Cushioned athletic crew socks in 75% cotton / 25% spandex blend. Sold as a 3-pack.',
    handle: 'athletic-crew-socks',
    amount: 1299,
    picsumId: 513,
    categoryHandles: ['accessories', 'socks'],
    sizes: ['s', 'm', 'l'],
  },
  {
    sku: 'VAR-BUCKET-HAT',
    name: 'Bucket Hat',
    description: '100% cotton bucket hat with a wide brim and adjustable drawstring.',
    handle: 'bucket-hat',
    amount: 2499,
    picsumId: 467,
    categoryHandles: ['accessories', 'hats'],
    colors: ['black', 'white', 'tan'],
  },
  {
    sku: 'VAR-SHORTS',
    name: 'Running Shorts',
    description: 'Lightweight 4" running shorts with liner and side pockets. Quick-dry fabric.',
    handle: 'running-shorts',
    amount: 3499,
    picsumId: 598,
    categoryHandles: ['apparel', 'bottoms'],
    colors: ['black', 'navy'],
    sizes: ['s', 'm', 'l', 'xl'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function checksumFor(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function deterministicSize(key: string): number {
  let h = 0;
  for (const c of key) h = Math.imul(31, h) + c.charCodeAt(0) | 0;
  return (Math.abs(h) % 200_000) + 80_000;
}

function picsumUrl(id: number): string {
  return `https://picsum.photos/id/${id}/800/800`;
}

async function upsertMedia(db: Db, input: {
  storageKey: string;
  picsumId: number;
  fileName: string;
  altText: string;
}): Promise<string> {
  const url = picsumUrl(input.picsumId);
  const [row] = await db
    .insert(media)
    .values({
      storageKey: input.storageKey,
      url,
      thumbnailUrl: url,
      fileName: input.fileName,
      mimeType: 'image/jpeg',
      sizeBytes: deterministicSize(input.storageKey),
      width: 800,
      height: 800,
      checksumSha256: checksumFor(input.storageKey),
      altText: input.altText,
    })
    .onConflictDoUpdate({
      target: media.storageKey,
      set: { url, thumbnailUrl: url, altText: input.altText },
    })
    .returning({ id: media.id });
  return row.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG SETUP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function ensureLanguage(db: Db): Promise<void> {
  await db
    .insert(languages)
    .values({ code: 'en', name: 'English', isDefault: true })
    .onConflictDoNothing();
}

async function ensureTaxClass(db: Db): Promise<string> {
  const [existing] = await db.select({ id: taxClasses.id }).from(taxClasses).limit(1);
  if (existing) return existing.id;
  const [created] = await db
    .insert(taxClasses)
    .values({ name: 'Standard' })
    .returning({ id: taxClasses.id });
  return created.id;
}

interface OptionCatalog {
  colorOptionId: string | null;
  sizeOptionId: string | null;
  colorValueIds: Map<string, string>;
  sizeValueIds: Map<string, string>;
}

async function ensureOptions(db: Db): Promise<OptionCatalog> {
  async function upsertOption(code: string): Promise<string> {
    const [row] = await db
      .insert(optionDefinitions)
      .values({ code })
      .onConflictDoUpdate({ target: optionDefinitions.code, set: { code } })
      .returning({ id: optionDefinitions.id });
    return row.id;
  }

  async function upsertOptionLabel(optionId: string, label: string): Promise<void> {
    await db
      .insert(optionDefinitionTranslations)
      .values({ optionId, languageCode: 'en', name: label })
      .onConflictDoNothing();
  }

  async function upsertValue(optionId: string, code: string, label: string): Promise<string> {
    const [row] = await db
      .insert(optionValues)
      .values({ optionId, code })
      .onConflictDoUpdate({ target: [optionValues.optionId, optionValues.code], set: { code } })
      .returning({ id: optionValues.id });
    await db
      .insert(optionValueTranslations)
      .values({ valueId: row.id, languageCode: 'en', label })
      .onConflictDoNothing();
    return row.id;
  }

  const colorOptionId = await upsertOption('color');
  await upsertOptionLabel(colorOptionId, 'Color');
  const colorValueIds = new Map<string, string>();
  for (const [code, label] of Object.entries(COLOR_LABELS)) {
    colorValueIds.set(code, await upsertValue(colorOptionId, code, label));
  }

  const sizeOptionId = await upsertOption('size');
  await upsertOptionLabel(sizeOptionId, 'Size');
  const sizeValueIds = new Map<string, string>();
  for (const [code, label] of Object.entries(SIZE_LABELS)) {
    sizeValueIds.set(code, await upsertValue(sizeOptionId, code, label));
  }

  return { colorOptionId, sizeOptionId, colorValueIds, sizeValueIds };
}

async function ensureCategories(db: Db): Promise<Map<string, string>> {
  const handleToId = new Map<string, string>();

  async function upsertCategory(spec: CategorySpec, parentId: string | null): Promise<string> {
    const [existing] = await db
      .select({ categoryId: categoryTranslations.categoryId })
      .from(categoryTranslations)
      .where(
        and(
          eq(categoryTranslations.handle, spec.handle),
          eq(categoryTranslations.languageCode, 'en')
        )
      )
      .limit(1);

    if (existing) return existing.categoryId;

    const [cat] = await db
      .insert(categories)
      .values({ parentId, isActive: true, rank: spec.rank })
      .returning({ id: categories.id });
    await db.insert(categoryTranslations).values({
      categoryId: cat.id,
      languageCode: 'en',
      name: spec.name,
      handle: spec.handle,
    });
    return cat.id;
  }

  // Root categories first
  for (const spec of CATEGORY_SPECS.filter((s) => !s.parentHandle)) {
    handleToId.set(spec.handle, await upsertCategory(spec, null));
  }

  // Child categories
  for (const spec of CATEGORY_SPECS.filter((s) => s.parentHandle)) {
    const parentId = handleToId.get(spec.parentHandle!) ?? null;
    handleToId.set(spec.handle, await upsertCategory(spec, parentId));
  }

  return handleToId;
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK LOCATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const LOCATION_SPECS = [
  { name: 'Main Warehouse' },
  { name: 'Retail Store' },
];

/**
 * Deterministic stock quantity per SKU + location.
 * Location 0 (Main Warehouse): mostly 20-120 units, ~15% low (1-8), ~5% zero.
 * Location 1 (Retail Store):   mostly 5-25 units,  ~10% low (1-4), ~10% zero.
 */
function stockFor(sku: string, locationIndex: number): number {
  let h = 0;
  for (const c of sku) h = Math.imul(31, h) + c.charCodeAt(0) | 0;
  const abs = Math.abs(h);

  if (locationIndex === 0) {
    const bucket = abs % 20;
    if (bucket === 0)      return 0;                       // 5%  — out of stock
    if (bucket <= 3)       return (abs >> 4) % 8 + 1;     // 15% — low (1–8)
    return                        (abs >> 6) % 101 + 20;  // 80% — normal (20–120)
  } else {
    const bucket = abs % 10;
    if (bucket === 0)      return 0;                       // 10% — zero
    if (bucket === 1)      return (abs >> 3) % 4 + 1;     // 10% — low (1–4)
    return                        (abs >> 5) % 21 + 5;    // 80% — normal (5–25)
  }
}

async function ensureStockLocations(db: Db): Promise<string[]> {
  const ids: string[] = [];
  for (const spec of LOCATION_SPECS) {
    const [existing] = await db
      .select({ id: stockLocations.id })
      .from(stockLocations)
      .where(eq(stockLocations.name, spec.name))
      .limit(1);

    if (existing) {
      ids.push(existing.id);
    } else {
      const [created] = await db
        .insert(stockLocations)
        .values({ name: spec.name })
        .returning({ id: stockLocations.id });
      ids.push(created.id);
    }
  }
  return ids;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING / INVENTORY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function createPriceSet(db: Db, amount: number): Promise<string> {
  const [set] = await db.insert(priceSets).values({}).returning({ id: priceSets.id });
  await db.insert(prices).values({
    priceSetId: set.id,
    currencyCode: 'EUR',
    amount,
    minQuantity: 1,
    taxInclusive: true,
  });
  return set.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CREATION
// ─────────────────────────────────────────────────────────────────────────────

function cartesian<T>(sets: T[][]): T[][] {
  if (sets.length === 0) return [[]];
  const [first, ...rest] = sets;
  return first.flatMap((item) => cartesian(rest).map((combo) => [item, ...combo]));
}

async function seedProduct(
  db: Db,
  spec: ProductSpec,
  taxClassId: string,
  options: OptionCatalog,
  categoryIds: Map<string, string>,
  locationIds: string[]
): Promise<void> {
  const isVariable = !!(spec.colors?.length || spec.sizes?.length);

  // ── Upsert product ─────────────────────────────────────────────────────────
  // uk_products_base_sku is a partial unique index (WHERE status != 'deleted'),
  // so ON CONFLICT (column) is not valid — check for existence first instead.
  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.baseSku, spec.sku))
    .limit(1);

  const product = existing ?? (
    await db
      .insert(products)
      .values({
        baseSku: spec.sku,
        status: 'published',
        type: isVariable ? 'variable' : 'simple',
        taxClassId,
      })
      .returning({ id: products.id })
  )[0];

  await db
    .insert(productTranslations)
    .values({
      productId: product.id,
      languageCode: 'en',
      name: spec.name,
      description: spec.description,
      handle: spec.handle,
    })
    .onConflictDoNothing();

  // ── Product-level media ────────────────────────────────────────────────────
  const productMediaId = await upsertMedia(db, {
    storageKey: `seed/products/${spec.sku.toLowerCase()}/main.jpg`,
    picsumId: spec.picsumId,
    fileName: `${spec.handle}-main.jpg`,
    altText: spec.name,
  });
  await db
    .insert(productMedia)
    .values({ productId: product.id, mediaId: productMediaId, rank: 0 })
    .onConflictDoNothing();

  // ── Categories ─────────────────────────────────────────────────────────────
  for (const handle of spec.categoryHandles) {
    const catId = categoryIds.get(handle);
    if (catId) {
      await db
        .insert(productCategories)
        .values({ productId: product.id, categoryId: catId })
        .onConflictDoNothing();
    }
  }

  // ── Options & variants ─────────────────────────────────────────────────────
  if (!isVariable) {
    // Simple product — single variant
    const priceSetId = await createPriceSet(db, spec.amount);
    const [inv] = await db
      .insert(inventoryItems)
      .values({ skuReference: spec.sku })
      .returning({ id: inventoryItems.id });
    await db.insert(productVariants).values({
      productId: product.id,
      sku: spec.sku,
      status: 'published',
      priceSetId,
      inventoryItemId: inv.id,
    });
    for (let i = 0; i < locationIds.length; i++) {
      await db.insert(inventoryLevels)
        .values({ inventoryItemId: inv.id, locationId: locationIds[i], stockedQuantity: stockFor(spec.sku, i) })
        .onConflictDoNothing();
    }
    return;
  }

  // Variable product — build assignment sets for each active option dimension

  interface Dimension {
    optionId: string;
    optionCode: 'color' | 'size';
    valueCodes: string[];
    // productOptionValues.id indexed by valueCode
    assignmentIdByCode: Map<string, string>;
  }

  const dimensions: Dimension[] = [];

  if (spec.colors?.length && options.colorOptionId) {
    const [productOption] = await db
      .insert(productOptions)
      .values({ productId: product.id, optionId: options.colorOptionId, rank: 0 })
      .onConflictDoUpdate({
        target: [productOptions.productId, productOptions.optionId],
        set: { rank: 0 },
      })
      .returning({ id: productOptions.id });

    const assignmentIdByCode = new Map<string, string>();
    for (let i = 0; i < spec.colors.length; i++) {
      const code = spec.colors[i];
      const globalValueId = options.colorValueIds.get(code)!;
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
    dimensions.push({
      optionId: options.colorOptionId,
      optionCode: 'color',
      valueCodes: spec.colors,
      assignmentIdByCode,
    });
  }

  if (spec.sizes?.length && options.sizeOptionId) {
    const sizeRank = dimensions.length; // 0 if no color, 1 if color already added
    const [productOption] = await db
      .insert(productOptions)
      .values({ productId: product.id, optionId: options.sizeOptionId, rank: sizeRank })
      .onConflictDoUpdate({
        target: [productOptions.productId, productOptions.optionId],
        set: { rank: sizeRank },
      })
      .returning({ id: productOptions.id });

    const assignmentIdByCode = new Map<string, string>();
    for (let i = 0; i < spec.sizes.length; i++) {
      const code = spec.sizes[i];
      const globalValueId = options.sizeValueIds.get(code)!;
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
    dimensions.push({
      optionId: options.sizeOptionId,
      optionCode: 'size',
      valueCodes: spec.sizes,
      assignmentIdByCode,
    });
  }

  // Build cartesian product of [{ dimensionIndex, valueCode }] combinations
  const dimensionValueCodes = dimensions.map((d) => d.valueCodes);
  for (const combo of cartesian(dimensionValueCodes)) {
    // combo[i] = valueCode for dimensions[i]
    const colorCode = combo[dimensions.findIndex((d) => d.optionCode === 'color')] ?? null;
    const sizeCode  = combo[dimensions.findIndex((d) => d.optionCode === 'size')]  ?? null;

    const skuSuffix = combo.map((code) => code.toUpperCase()).join('-');
    const variantSku = `${spec.sku}-${skuSuffix}`;

    const priceSetId = await createPriceSet(db, spec.amount);
    const [inv] = await db
      .insert(inventoryItems)
      .values({ skuReference: variantSku })
      .returning({ id: inventoryItems.id });

    const [variant] = await db
      .insert(productVariants)
      .values({
        productId: product.id,
        sku: variantSku,
        status: 'published',
        priceSetId,
        inventoryItemId: inv.id,
      })
      .returning({ id: productVariants.id });

    // Link variant to its productOptionValues assignments
    for (let i = 0; i < dimensions.length; i++) {
      const assignmentId = dimensions[i].assignmentIdByCode.get(combo[i])!;
      await db
        .insert(variantOptionValues)
        .values({ variantId: variant.id, valueId: assignmentId })
        .onConflictDoNothing();
    }

    // Inventory levels for each location
    for (let i = 0; i < locationIds.length; i++) {
      await db.insert(inventoryLevels)
        .values({ inventoryItemId: inv.id, locationId: locationIds[i], stockedQuantity: stockFor(variantSku, i) })
        .onConflictDoNothing();
    }

    // Attach variant media for color variants (size-only variants use the product image)
    if (colorCode && COLOR_PICSUM[colorCode] !== undefined) {
      const colorMediaId = await upsertMedia(db, {
        storageKey: `seed/colors/${colorCode}/800x800.jpg`,
        picsumId: COLOR_PICSUM[colorCode],
        fileName: `color-${colorCode}.jpg`,
        altText: `${spec.name} — ${COLOR_LABELS[colorCode]}${sizeCode ? ` / ${SIZE_LABELS[sizeCode] ?? sizeCode}` : ''}`,
      });
      await db
        .insert(variantMedia)
        .values({ variantId: variant.id, mediaId: colorMediaId, rank: 0 })
        .onConflictDoNothing();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  config({ path: resolve(process.cwd(), '../../.env') });

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set. Check your .env file.');
    process.exit(1);
  }

  const { db, closeDatabase: closeDb } = await import('../src/client');
  closeDatabase = closeDb;

  await ensureLanguage(db);
  const taxClassId = await ensureTaxClass(db);
  const options = await ensureOptions(db);
  const categoryIds = await ensureCategories(db);
  const locationIds = await ensureStockLocations(db);
  console.log(`Stock locations: ${LOCATION_SPECS.map((l) => l.name).join(', ')}`);

  console.log(`Seeding ${PRODUCT_SPECS.length} products...`);
  for (const spec of PRODUCT_SPECS) {
    await seedProduct(db, spec, taxClassId, options, categoryIds, locationIds);
    console.log(`  ✓ ${spec.sku}  ${spec.name}`);
  }

  const simpleCount = PRODUCT_SPECS.filter((p) => !p.colors?.length && !p.sizes?.length).length;
  const variableCount = PRODUCT_SPECS.length - simpleCount;
  console.log(`\nDone. ${simpleCount} simple, ${variableCount} variable products across ${categoryIds.size} categories, stocked at ${locationIds.length} locations.`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
