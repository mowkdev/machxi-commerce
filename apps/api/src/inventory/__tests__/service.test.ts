import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '@repo/database/client';
import { eq } from '@repo/database';
import {
  inventoryItems,
  inventoryLevels,
  inventoryTransactions,
  languages,
  priceSets,
  productTranslations,
  productVariants,
  products,
  stockLocations,
  taxClasses,
} from '@repo/database/schema';
import {
  createInventoryAdjustment,
  createInventoryLevel,
  createInventoryTransfer,
  deleteInventoryLevel,
  listInventoryLevels,
  listInventoryTransactions,
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

async function createInventoryFixture(label: string) {
  const token = uniqueToken();
  const [taxClass] = await db
    .insert(taxClasses)
    .values({ name: `Tax ${label} ${token}` })
    .returning({ id: taxClasses.id });
  const [product] = await db
    .insert(products)
    .values({
      baseSku: `BASE-${token}`,
      status: 'draft',
      type: 'simple',
      taxClassId: taxClass.id,
    })
    .returning({ id: products.id });
  await db.insert(productTranslations).values({
    productId: product.id,
    languageCode: 'en',
    name: `${label} Product ${token}`,
    handle: `${label.toLowerCase()}-${token}`,
  });
  const [priceSet] = await db.insert(priceSets).values({}).returning({ id: priceSets.id });
  const [inventoryItem] = await db
    .insert(inventoryItems)
    .values({ skuReference: `SKU-${token}` })
    .returning({ id: inventoryItems.id });
  const [variant] = await db
    .insert(productVariants)
    .values({
      productId: product.id,
      sku: `SKU-${token}`,
      status: 'draft',
      priceSetId: priceSet.id,
      inventoryItemId: inventoryItem.id,
    })
    .returning({ id: productVariants.id, sku: productVariants.sku });
  const [location] = await db
    .insert(stockLocations)
    .values({ name: `Warehouse ${token}` })
    .returning({ id: stockLocations.id, name: stockLocations.name });
  const [secondaryLocation] = await db
    .insert(stockLocations)
    .values({ name: `Overflow Warehouse ${token}` })
    .returning({ id: stockLocations.id, name: stockLocations.name });

  return { product, inventoryItem, variant, location, secondaryLocation };
}

describe('inventory service', () => {
  it('creates and lists an explicit inventory level with zero quantity', async () => {
    const fixture = await createInventoryFixture('List');

    const created = await createInventoryLevel({
      inventoryItemId: fixture.inventoryItem.id,
      locationId: fixture.location.id,
    });

    expect(created.stockedQuantity).toBe(0);

    const result = await listInventoryLevels({
      page: 1,
      pageSize: 20,
      search: fixture.variant.sku,
      locationId: fixture.location.id,
      sortBy: 'sku',
      sortOrder: 'asc',
    });

    const row = result.data.find(
      (item) =>
        item.inventoryItemId === fixture.inventoryItem.id &&
        item.locationId === fixture.location.id
    );
    expect(row).toBeDefined();
    expect(row!.stockedQuantity).toBe(0);
  });

  it('rejects duplicate inventory level assignments', async () => {
    const fixture = await createInventoryFixture('Duplicate');

    await createInventoryLevel({
      inventoryItemId: fixture.inventoryItem.id,
      locationId: fixture.location.id,
    });

    await expect(
      createInventoryLevel({
        inventoryItemId: fixture.inventoryItem.id,
        locationId: fixture.location.id,
      })
    ).rejects.toThrow('already assigned');
  });

  it('removes a zero-stock inventory level', async () => {
    const fixture = await createInventoryFixture('Remove');
    await createInventoryLevel({
      inventoryItemId: fixture.inventoryItem.id,
      locationId: fixture.location.id,
    });

    const result = await deleteInventoryLevel(fixture.inventoryItem.id, fixture.location.id);

    expect(result.deleted).toBe(true);
    const levels = await db
      .select()
      .from(inventoryLevels)
      .where(eq(inventoryLevels.inventoryItemId, fixture.inventoryItem.id));
    expect(levels.some((level) => level.locationId === fixture.location.id)).toBe(false);
  });

  it('creates an audited adjustment and updates the inventory level', async () => {
    const fixture = await createInventoryFixture('Adjust');

    const result = await createInventoryAdjustment({
      inventoryItemId: fixture.inventoryItem.id,
      locationId: fixture.location.id,
      quantity: 5,
      reason: 'restock',
    });

    expect(result.stockedQuantity).toBe(5);

    const levels = await db
      .select()
      .from(inventoryLevels)
      .where(eq(inventoryLevels.inventoryItemId, fixture.inventoryItem.id));
    expect(levels.some((level) => level.stockedQuantity === 5)).toBe(true);

    const transactions = await listInventoryTransactions({
      page: 1,
      pageSize: 20,
      inventoryItemId: fixture.inventoryItem.id,
      locationId: fixture.location.id,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    expect(transactions.data.some((transaction) => transaction.id === result.transactionId)).toBe(
      true
    );
  });

  it('rejects adjustments that would make stock negative', async () => {
    const fixture = await createInventoryFixture('Negative');

    await expect(
      createInventoryAdjustment({
        inventoryItemId: fixture.inventoryItem.id,
        locationId: fixture.location.id,
        quantity: -1,
        reason: 'shrinkage',
      })
    ).rejects.toThrow('negative');
  });

  it('rejects removing a non-zero inventory level', async () => {
    const fixture = await createInventoryFixture('Remove Non Zero');
    await createInventoryAdjustment({
      inventoryItemId: fixture.inventoryItem.id,
      locationId: fixture.location.id,
      quantity: 3,
      reason: 'restock',
    });

    await expect(
      deleteInventoryLevel(fixture.inventoryItem.id, fixture.location.id)
    ).rejects.toThrow('zero stock');
  });

  it('transfers stock with paired audited transactions', async () => {
    const fixture = await createInventoryFixture('Transfer');
    await createInventoryAdjustment({
      inventoryItemId: fixture.inventoryItem.id,
      locationId: fixture.location.id,
      quantity: 8,
      reason: 'restock',
    });

    const result = await createInventoryTransfer({
      inventoryItemId: fixture.inventoryItem.id,
      fromLocationId: fixture.location.id,
      toLocationId: fixture.secondaryLocation.id,
      quantity: 5,
      reason: 'adjustment',
    });

    expect(result.fromStockedQuantity).toBe(3);
    expect(result.toStockedQuantity).toBe(5);

    const transferTransactions = await db
      .select()
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.referenceId, result.transferId));
    expect(transferTransactions).toHaveLength(2);
    expect(transferTransactions.map((transaction) => transaction.quantity).sort()).toEqual([
      -5,
      5,
    ]);
  });

  it('rejects transfers with insufficient source stock', async () => {
    const fixture = await createInventoryFixture('Transfer Insufficient');
    await createInventoryAdjustment({
      inventoryItemId: fixture.inventoryItem.id,
      locationId: fixture.location.id,
      quantity: 2,
      reason: 'restock',
    });

    await expect(
      createInventoryTransfer({
        inventoryItemId: fixture.inventoryItem.id,
        fromLocationId: fixture.location.id,
        toLocationId: fixture.secondaryLocation.id,
        quantity: 3,
        reason: 'adjustment',
      })
    ).rejects.toThrow('exceeds available');
  });
});
