import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '@repo/database/client';
import { eq } from '@repo/database';
import {
  languages,
  prices,
  priceSets,
  productTranslations,
  products,
  productVariants,
  taxClasses,
} from '@repo/database/schema';
import type { CreatePriceListBody } from '@repo/types/admin';
import {
  createPriceList,
  createPriceListPrice,
  deletePriceList,
  deletePriceListPrice,
  getPriceList,
  listPriceLists,
  listPriceSetTargets,
  PriceListValidationError,
  updatePriceList,
  updatePriceListPrice,
} from '../service';

beforeAll(async () => {
  const existingLang = await db
    .select()
    .from(languages)
    .where(eq(languages.code, 'en'))
    .limit(1);

  if (existingLang.length === 0) {
    await db.insert(languages).values({
      code: 'en',
      name: 'English',
      isDefault: true,
    });
  }
});

function uniqueToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createBasePrice(currencyCode = 'USD', minQuantity = 1) {
  const [priceSet] = await db.insert(priceSets).values({}).returning({ id: priceSets.id });
  await db.insert(prices).values({
    priceSetId: priceSet.id,
    currencyCode,
    amount: 2500,
    minQuantity,
    taxInclusive: false,
  });
  return priceSet.id;
}

function makeCreateBody(label: string, overrides?: Partial<CreatePriceListBody>) {
  const token = uniqueToken();

  return {
    status: 'draft',
    type: 'sale',
    startsAt: null,
    endsAt: null,
    translations: [
      {
        languageCode: 'en',
        name: `${label} ${token}`,
        description: `${label} description`,
      },
    ],
    prices: [],
    ...overrides,
  } satisfies CreatePriceListBody;
}

describe('price list service', () => {
  it('creates and retrieves a price list with translations and prices', async () => {
    const priceSetId = await createBasePrice();
    const body = makeCreateBody('Launch Sale', {
      prices: [{ priceSetId, currencyCode: 'usd', amount: 1999, minQuantity: 1 }],
    });

    const result = await createPriceList(body);
    const priceList = await getPriceList(result.id);

    expect(priceList).not.toBeNull();
    expect(priceList!.type).toBe('sale');
    expect(priceList!.translations[0].name).toBe(body.translations[0].name);
    expect(priceList!.prices).toHaveLength(1);
    expect(priceList!.prices[0].currencyCode).toBe('USD');
  });

  it('lists price lists with search, filters, and metadata', async () => {
    const body = makeCreateBody('Searchable Price List', {
      status: 'active',
      type: 'override',
    });
    await createPriceList(body);

    const result = await listPriceLists({
      page: 1,
      pageSize: 20,
      search: body.translations[0].name,
      languageCode: 'en',
      status: 'active',
      type: 'override',
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(result.meta.totalItems).toBeGreaterThanOrEqual(1);
    expect(result.data.some((priceList) => priceList.name === body.translations[0].name)).toBe(
      true
    );
  });

  it('updates schedule and translation fields', async () => {
    const created = await createPriceList(makeCreateBody('Update Sale'));
    const startsAt = new Date('2030-01-01T00:00:00.000Z').toISOString();
    const endsAt = new Date('2030-01-10T00:00:00.000Z').toISOString();

    const updated = await updatePriceList(created.id, {
      status: 'active',
      startsAt,
      endsAt,
      translations: [
        {
          languageCode: 'en',
          name: `Updated Sale ${uniqueToken()}`,
          description: 'Updated description',
        },
      ],
    });

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('active');
    expect(new Date(updated!.startsAt!).toISOString()).toBe(startsAt);
    expect(new Date(updated!.endsAt!).toISOString()).toBe(endsAt);
    expect(updated!.translations[0].description).toBe('Updated description');
  });

  it('manages price rows independently', async () => {
    const priceSetId = await createBasePrice('EUR');
    const created = await createPriceList(makeCreateBody('Price Rows'));

    const price = await createPriceListPrice(created.id, {
      priceSetId,
      currencyCode: 'eur',
      amount: 1500,
      minQuantity: 1,
    });
    expect(price).not.toBeNull();
    expect(price!.currencyCode).toBe('EUR');

    const updated = await updatePriceListPrice(created.id, price!.id, { amount: 1400 });
    expect(updated!.amount).toBe(1400);

    await expect(deletePriceListPrice(created.id, price!.id)).resolves.toBe(true);
  });

  it('rejects price rows that do not match an existing base price', async () => {
    const priceSetId = await createBasePrice('GBP', 1);
    const created = await createPriceList(makeCreateBody('Invalid Base Match'));

    await expect(
      createPriceListPrice(created.id, {
        priceSetId,
        currencyCode: 'GBP',
        amount: 1200,
        minQuantity: 2,
      })
    ).rejects.toBeInstanceOf(PriceListValidationError);
  });

  it('deletes a price list', async () => {
    const created = await createPriceList(makeCreateBody('Delete Sale'));

    await expect(deletePriceList(created.id)).resolves.toBe(true);
    await expect(getPriceList(created.id)).resolves.toBeNull();
  });

  it('lists product variant price set targets', async () => {
    const token = uniqueToken();
    const [taxClass] = await db
      .insert(taxClasses)
      .values({ name: `Target Tax ${token}` })
      .returning({ id: taxClasses.id });
    const priceSetId = await createBasePrice('USD');
    const [product] = await db
      .insert(products)
      .values({
        taxClassId: taxClass.id,
        baseSku: `target-${token}`,
        status: 'published',
        type: 'simple',
      })
      .returning({ id: products.id });
    await db.insert(productTranslations).values({
      productId: product.id,
      languageCode: 'en',
      name: `Target Product ${token}`,
      handle: `target-product-${token}`,
    });
    await db.insert(productVariants).values({
      productId: product.id,
      sku: `target-sku-${token}`,
      status: 'published',
      priceSetId,
    });

    const result = await listPriceSetTargets({
      page: 1,
      pageSize: 20,
      search: `target-sku-${token}`,
      languageCode: 'en',
      sortBy: 'sku',
      sortOrder: 'asc',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].priceSetId).toBe(priceSetId);
    expect(result.data[0].basePrices[0].currencyCode).toBe('USD');
  });
});
