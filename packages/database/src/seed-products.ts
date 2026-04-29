import { config } from 'dotenv';
import { resolve } from 'node:path';
import {
  inventoryItems,
  languages,
  optionDefinitions,
  optionDefinitionTranslations,
  optionValues,
  optionValueTranslations,
  prices,
  priceSets,
  productOptions,
  productOptionValues,
  products,
  productTranslations,
  productVariants,
  taxClasses,
  variantOptionValues,
} from './schema';

let closeDatabase: () => Promise<void> = async () => {};

interface SeedOptionValue {
  code: string;
  label: string;
}

interface SeedOption {
  code: string;
  name: string;
  values: SeedOptionValue[];
}

const colorOption: SeedOption = {
  code: 'color',
  name: 'Color',
  values: [
    { code: 'red', label: 'Red' },
    { code: 'blue', label: 'Blue' },
    { code: 'green', label: 'Green' },
    { code: 'black', label: 'Black' },
    { code: 'white', label: 'White' },
  ],
};

const sizeOption: SeedOption = {
  code: 'size',
  name: 'Size',
  values: [
    { code: 's', label: 'S' },
    { code: 'm', label: 'M' },
    { code: 'l', label: 'L' },
    { code: 'xl', label: 'XL' },
  ],
};

function cartesian<T>(sets: T[][]): T[][] {
  if (sets.length === 0) return [[]];
  const [first, ...rest] = sets;
  return first.flatMap((item) => cartesian(rest).map((combo) => [item, ...combo]));
}

async function ensureLanguage(db: Awaited<typeof import('./client')>['db']) {
  await db
    .insert(languages)
    .values({ code: 'en', name: 'English', isDefault: true })
    .onConflictDoNothing();
}

async function ensureTaxClass(db: Awaited<typeof import('./client')>['db']) {
  const [existing] = await db.select({ id: taxClasses.id }).from(taxClasses).limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(taxClasses)
    .values({ name: 'Standard' })
    .returning({ id: taxClasses.id });
  return created.id;
}

async function ensureOptionCatalog(
  db: Awaited<typeof import('./client')>['db'],
  option: SeedOption
) {
  const [createdOption] = await db
    .insert(optionDefinitions)
    .values({ code: option.code })
    .onConflictDoUpdate({
      target: optionDefinitions.code,
      set: { code: option.code },
    })
    .returning({ id: optionDefinitions.id });

  await db
    .insert(optionDefinitionTranslations)
    .values({ optionId: createdOption.id, languageCode: 'en', name: option.name })
    .onConflictDoNothing();

  const valueIds = new Map<string, string>();
  for (const value of option.values) {
    const [createdValue] = await db
      .insert(optionValues)
      .values({ optionId: createdOption.id, code: value.code })
      .onConflictDoUpdate({
        target: [optionValues.optionId, optionValues.code],
        set: { code: value.code },
      })
      .returning({ id: optionValues.id });

    await db
      .insert(optionValueTranslations)
      .values({ valueId: createdValue.id, languageCode: 'en', label: value.label })
      .onConflictDoNothing();

    valueIds.set(value.code, createdValue.id);
  }

  return { id: createdOption.id, valueIds };
}

async function createPriceSetWithPrice(
  db: Awaited<typeof import('./client')>['db'],
  amount: number
) {
  const [priceSet] = await db.insert(priceSets).values({}).returning({ id: priceSets.id });
  await db.insert(prices).values({
    priceSetId: priceSet.id,
    currencyCode: 'EUR',
    amount,
    minQuantity: 1,
    taxInclusive: true,
  });
  return priceSet.id;
}

async function createProductBase(
  db: Awaited<typeof import('./client')>['db'],
  input: { sku: string; name: string; type: 'simple' | 'variable'; taxClassId: string }
) {
  const [product] = await db
    .insert(products)
    .values({
      baseSku: input.sku,
      status: 'draft',
      type: input.type,
      taxClassId: input.taxClassId,
    })
    .returning({ id: products.id });

  await db.insert(productTranslations).values({
    productId: product.id,
    languageCode: 'en',
    name: input.name,
    handle: input.sku.toLowerCase(),
  });

  return product.id;
}

async function createVariant(
  db: Awaited<typeof import('./client')>['db'],
  input: {
    productId: string;
    sku: string;
    amount: number;
    optionAssignmentValueIds?: string[];
  }
) {
  const priceSetId = await createPriceSetWithPrice(db, input.amount);
  const [inventoryItem] = await db
    .insert(inventoryItems)
    .values({ skuReference: input.sku })
    .returning({ id: inventoryItems.id });

  const [variant] = await db
    .insert(productVariants)
    .values({
      productId: input.productId,
      sku: input.sku,
      status: 'draft',
      priceSetId,
      inventoryItemId: inventoryItem.id,
    })
    .returning({ id: productVariants.id });

  if (input.optionAssignmentValueIds?.length) {
    await db.insert(variantOptionValues).values(
      input.optionAssignmentValueIds.map((valueId) => ({
        variantId: variant.id,
        valueId,
      }))
    );
  }
}

async function createSimpleProduct(
  db: Awaited<typeof import('./client')>['db'],
  input: { sku: string; name: string; amount: number; taxClassId: string }
) {
  const productId = await createProductBase(db, {
    sku: input.sku,
    name: input.name,
    type: 'simple',
    taxClassId: input.taxClassId,
  });
  await createVariant(db, { productId, sku: input.sku, amount: input.amount });
}

async function assignOption(
  db: Awaited<typeof import('./client')>['db'],
  input: {
    productId: string;
    rank: number;
    optionId: string;
    valueIds: string[];
  }
) {
  const [productOption] = await db
    .insert(productOptions)
    .values({
      productId: input.productId,
      optionId: input.optionId,
      rank: input.rank,
    })
    .returning({ id: productOptions.id });

  const assignmentIds: string[] = [];
  for (let index = 0; index < input.valueIds.length; index++) {
    const [assignment] = await db
      .insert(productOptionValues)
      .values({
        productOptionId: productOption.id,
        optionValueId: input.valueIds[index],
        rank: index,
      })
      .returning({ id: productOptionValues.id });
    assignmentIds.push(assignment.id);
  }

  return assignmentIds;
}

async function createVariableProduct(
  db: Awaited<typeof import('./client')>['db'],
  input: {
    sku: string;
    name: string;
    amount: number;
    taxClassId: string;
    options: { optionId: string; valueIds: string[] }[];
  }
) {
  const productId = await createProductBase(db, {
    sku: input.sku,
    name: input.name,
    type: 'variable',
    taxClassId: input.taxClassId,
  });

  const assignmentSets: string[][] = [];
  for (let index = 0; index < input.options.length; index++) {
    assignmentSets.push(
      await assignOption(db, {
        productId,
        rank: index,
        optionId: input.options[index].optionId,
        valueIds: input.options[index].valueIds,
      })
    );
  }

  for (const combo of cartesian(assignmentSets)) {
    const suffix = combo.map((id) => id.slice(0, 4).toUpperCase()).join('-');
    await createVariant(db, {
      productId,
      sku: `${input.sku}-${suffix}`,
      amount: input.amount,
      optionAssignmentValueIds: combo,
    });
  }
}

async function main(): Promise<void> {
  config({ path: resolve(process.cwd(), '../../.env') });

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set. Check your .env file.');
    process.exit(1);
  }

  const { db, closeDatabase: closeDb } = await import('./client');
  closeDatabase = closeDb;

  await ensureLanguage(db);
  const taxClassId = await ensureTaxClass(db);
  const color = await ensureOptionCatalog(db, colorOption);
  const size = await ensureOptionCatalog(db, sizeOption);

  await createSimpleProduct(db, { sku: 'SIMPLE-MUG', name: 'Ceramic Mug', amount: 1299, taxClassId });
  await createSimpleProduct(db, { sku: 'SIMPLE-TOTE', name: 'Canvas Tote', amount: 1899, taxClassId });
  await createSimpleProduct(db, { sku: 'SIMPLE-CAP', name: 'Classic Cap', amount: 2199, taxClassId });
  await createSimpleProduct(db, { sku: 'SIMPLE-STICKERS', name: 'Sticker Pack', amount: 499, taxClassId });

  await createVariableProduct(db, {
    sku: 'COLOR-TEE',
    name: 'Color Tee',
    amount: 2499,
    taxClassId,
    options: [{ optionId: color.id, valueIds: ['red', 'blue'].map((code) => color.valueIds.get(code)!)}],
  });
  await createVariableProduct(db, {
    sku: 'COLOR-HOODIE',
    name: 'Color Hoodie',
    amount: 5999,
    taxClassId,
    options: [{ optionId: color.id, valueIds: ['black', 'white', 'green'].map((code) => color.valueIds.get(code)!)}],
  });
  await createVariableProduct(db, {
    sku: 'COLOR-BOTTLE',
    name: 'Color Bottle',
    amount: 1799,
    taxClassId,
    options: [{ optionId: color.id, valueIds: ['red', 'green'].map((code) => color.valueIds.get(code)!)}],
  });
  await createVariableProduct(db, {
    sku: 'SIZE-SOCKS',
    name: 'Sized Socks',
    amount: 999,
    taxClassId,
    options: [{ optionId: size.id, valueIds: ['s', 'm', 'l'].map((code) => size.valueIds.get(code)!)}],
  });
  await createVariableProduct(db, {
    sku: 'SIZE-JACKET',
    name: 'Sized Jacket',
    amount: 8999,
    taxClassId,
    options: [{ optionId: size.id, valueIds: ['m', 'l', 'xl'].map((code) => size.valueIds.get(code)!)}],
  });
  await createVariableProduct(db, {
    sku: 'COLOR-SIZE-SWEATSHIRT',
    name: 'Color Size Sweatshirt',
    amount: 4999,
    taxClassId,
    options: [
      { optionId: color.id, valueIds: ['red', 'blue'].map((code) => color.valueIds.get(code)!) },
      { optionId: size.id, valueIds: ['s', 'm', 'l'].map((code) => size.valueIds.get(code)!) },
    ],
  });

  console.log('Seeded 10 products with reusable Color and Size options.');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
