import { db } from '@repo/database/client';
import { and, asc, desc, eq, ilike, isNotNull, ne, or, sql } from '@repo/database';
import {
  inventoryItems,
  inventoryLevels,
  inventoryTransactions,
  productTranslations,
  productVariants,
  products,
  stockLocations,
} from '@repo/database/schema';
import type { PaginationMeta } from '@repo/types';
import { conflict, notFound } from '../lib/errors';
import type {
  CreateInventoryAdjustmentBody,
  CreateInventoryLevelBody,
  CreateInventoryTransferBody,
  DeleteInventoryLevelResult,
  InventoryAdjustmentResult,
  InventoryItemOption,
  InventoryLevelResult,
  InventoryLevelListItem,
  InventoryTransferResult,
  InventoryTransactionListItem,
  ListInventoryItemsQuery,
  ListInventoryQuery,
  ListInventoryTransactionsQuery,
} from './schema';
import { randomUUID } from 'node:crypto';

const INVENTORY_SORT_COLUMNS = {
  productName: sql`coalesce(${productTranslations.name}, '')`,
  sku: productVariants.sku,
  locationName: stockLocations.name,
  stockedQuantity: sql`coalesce(${inventoryLevels.stockedQuantity}, 0)`,
  updatedAt: sql`coalesce(${inventoryLevels.updatedAt}, ${productVariants.updatedAt})`,
} as const;

export async function listInventoryLevels(
  query: ListInventoryQuery
): Promise<{ data: InventoryLevelListItem[]; meta: PaginationMeta }> {
  const filters = [
    ne(productVariants.status, 'deleted'),
    isNotNull(productVariants.inventoryItemId),
  ];

  if (query.locationId) {
    filters.push(eq(stockLocations.id, query.locationId));
  }

  if (query.search) {
    const search = `%${query.search}%`;
    filters.push(
      or(
        ilike(productVariants.sku, search),
        ilike(products.baseSku, search),
        ilike(productTranslations.name, search),
        ilike(stockLocations.name, search)
      )!
    );
  }

  const stockedQuantity = sql<number>`${inventoryLevels.stockedQuantity}`.mapWith(Number);
  const sortColumn = INVENTORY_SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      inventoryItemId: inventoryItems.id,
      productId: products.id,
      productName: productTranslations.name,
      variantId: productVariants.id,
      sku: productVariants.sku,
      locationId: stockLocations.id,
      locationName: stockLocations.name,
      stockedQuantity,
      updatedAt: inventoryLevels.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(inventoryLevels)
    .innerJoin(inventoryItems, eq(inventoryItems.id, inventoryLevels.inventoryItemId))
    .innerJoin(productVariants, eq(productVariants.inventoryItemId, inventoryItems.id))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .innerJoin(stockLocations, eq(stockLocations.id, inventoryLevels.locationId))
    .leftJoin(
      productTranslations,
      and(
        eq(productTranslations.productId, products.id),
        eq(productTranslations.languageCode, 'en')
      )
    )
    .where(and(...filters))
    .orderBy(orderBy, asc(productVariants.id), asc(stockLocations.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const data: InventoryLevelListItem[] = rows.map(({ totalCount: _, ...rest }) => rest);

  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      totalItems,
    },
  };
}

export async function listInventoryItems(
  query: ListInventoryItemsQuery
): Promise<{ data: InventoryItemOption[]; meta: PaginationMeta }> {
  const filters = [
    ne(productVariants.status, 'deleted'),
    isNotNull(productVariants.inventoryItemId),
  ];

  if (query.search) {
    const search = `%${query.search}%`;
    filters.push(
      or(
        ilike(productVariants.sku, search),
        ilike(products.baseSku, search),
        ilike(productTranslations.name, search)
      )!
    );
  }

  const offset = (query.page - 1) * query.pageSize;
  const rows = await db
    .select({
      inventoryItemId: inventoryItems.id,
      productId: products.id,
      productName: productTranslations.name,
      variantId: productVariants.id,
      sku: productVariants.sku,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .innerJoin(inventoryItems, eq(inventoryItems.id, productVariants.inventoryItemId))
    .leftJoin(
      productTranslations,
      and(
        eq(productTranslations.productId, products.id),
        eq(productTranslations.languageCode, 'en')
      )
    )
    .where(and(...filters))
    .orderBy(asc(productTranslations.name), asc(productVariants.sku), asc(productVariants.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const data: InventoryItemOption[] = rows.map(({ totalCount: _, ...rest }) => rest);

  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      totalItems,
    },
  };
}

export async function createInventoryLevel(
  body: CreateInventoryLevelBody
): Promise<InventoryLevelResult> {
  const [inventoryItem] = await db
    .select({ id: inventoryItems.id })
    .from(inventoryItems)
    .where(eq(inventoryItems.id, body.inventoryItemId))
    .limit(1);
  if (!inventoryItem) throw notFound('Inventory item not found');

  const [location] = await db
    .select({ id: stockLocations.id })
    .from(stockLocations)
    .where(eq(stockLocations.id, body.locationId))
    .limit(1);
  if (!location) throw notFound('Stock location not found');

  const [existingLevel] = await db
    .select({ stockedQuantity: inventoryLevels.stockedQuantity })
    .from(inventoryLevels)
    .where(
      and(
        eq(inventoryLevels.inventoryItemId, body.inventoryItemId),
        eq(inventoryLevels.locationId, body.locationId)
      )
    )
    .limit(1);
  if (existingLevel) {
    throw conflict('Inventory item is already assigned to this stock location.');
  }

  await db.insert(inventoryLevels).values({
    inventoryItemId: body.inventoryItemId,
    locationId: body.locationId,
    stockedQuantity: 0,
  });

  return {
    inventoryItemId: body.inventoryItemId,
    locationId: body.locationId,
    stockedQuantity: 0,
  };
}

export async function deleteInventoryLevel(
  inventoryItemId: string,
  locationId: string
): Promise<DeleteInventoryLevelResult> {
  const [level] = await db
    .select({ stockedQuantity: inventoryLevels.stockedQuantity })
    .from(inventoryLevels)
    .where(
      and(
        eq(inventoryLevels.inventoryItemId, inventoryItemId),
        eq(inventoryLevels.locationId, locationId)
      )
    )
    .limit(1);

  if (!level) throw notFound('Inventory level not found');
  if (level.stockedQuantity !== 0) {
    throw conflict('Inventory level must have zero stock before it can be removed.');
  }

  await db
    .delete(inventoryLevels)
    .where(
      and(
        eq(inventoryLevels.inventoryItemId, inventoryItemId),
        eq(inventoryLevels.locationId, locationId)
      )
    );

  return { inventoryItemId, locationId, deleted: true };
}

export async function createInventoryAdjustment(
  body: CreateInventoryAdjustmentBody
): Promise<InventoryAdjustmentResult> {
  return db.transaction(async (tx) => {
    const [inventoryItem] = await tx
      .select({ id: inventoryItems.id })
      .from(inventoryItems)
      .where(eq(inventoryItems.id, body.inventoryItemId))
      .limit(1);
    if (!inventoryItem) throw notFound('Inventory item not found');

    const [location] = await tx
      .select({ id: stockLocations.id })
      .from(stockLocations)
      .where(eq(stockLocations.id, body.locationId))
      .limit(1);
    if (!location) throw notFound('Stock location not found');

    const [currentLevel] = await tx
      .select({ stockedQuantity: inventoryLevels.stockedQuantity })
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.inventoryItemId, body.inventoryItemId),
          eq(inventoryLevels.locationId, body.locationId)
        )
      )
      .limit(1);

    const currentQuantity = currentLevel?.stockedQuantity ?? 0;
    const nextQuantity = currentQuantity + body.quantity;
    if (nextQuantity < 0) {
      throw conflict('Inventory adjustment would make stocked quantity negative.');
    }

    const [transaction] = await tx
      .insert(inventoryTransactions)
      .values({
        inventoryItemId: body.inventoryItemId,
        locationId: body.locationId,
        quantity: body.quantity,
        reason: body.reason,
        referenceId: body.referenceId ?? null,
      })
      .returning({ id: inventoryTransactions.id });

    if (currentLevel) {
      await tx
        .update(inventoryLevels)
        .set({ stockedQuantity: nextQuantity })
        .where(
          and(
            eq(inventoryLevels.inventoryItemId, body.inventoryItemId),
            eq(inventoryLevels.locationId, body.locationId)
          )
        );
    } else {
      await tx.insert(inventoryLevels).values({
        inventoryItemId: body.inventoryItemId,
        locationId: body.locationId,
        stockedQuantity: nextQuantity,
      });
    }

    return {
      transactionId: transaction.id,
      inventoryItemId: body.inventoryItemId,
      locationId: body.locationId,
      stockedQuantity: nextQuantity,
    };
  });
}

export async function createInventoryTransfer(
  body: CreateInventoryTransferBody
): Promise<InventoryTransferResult> {
  if (body.fromLocationId === body.toLocationId) {
    throw conflict('Source and destination stock locations must be different.');
  }

  return db.transaction(async (tx) => {
    const [sourceLevel] = await tx
      .select({ stockedQuantity: inventoryLevels.stockedQuantity })
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.inventoryItemId, body.inventoryItemId),
          eq(inventoryLevels.locationId, body.fromLocationId)
        )
      )
      .limit(1);

    if (!sourceLevel) throw notFound('Source inventory level not found');
    if (sourceLevel.stockedQuantity < body.quantity) {
      throw conflict('Transfer quantity exceeds available stock at the source location.');
    }

    const [destinationLocation] = await tx
      .select({ id: stockLocations.id })
      .from(stockLocations)
      .where(eq(stockLocations.id, body.toLocationId))
      .limit(1);
    if (!destinationLocation) throw notFound('Destination stock location not found');

    const [destinationLevel] = await tx
      .select({ stockedQuantity: inventoryLevels.stockedQuantity })
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.inventoryItemId, body.inventoryItemId),
          eq(inventoryLevels.locationId, body.toLocationId)
        )
      )
      .limit(1);

    const transferId = randomUUID();
    const fromStockedQuantity = sourceLevel.stockedQuantity - body.quantity;
    const toStockedQuantity = (destinationLevel?.stockedQuantity ?? 0) + body.quantity;

    await tx.insert(inventoryTransactions).values([
      {
        inventoryItemId: body.inventoryItemId,
        locationId: body.fromLocationId,
        quantity: -body.quantity,
        reason: body.reason,
        referenceId: transferId,
      },
      {
        inventoryItemId: body.inventoryItemId,
        locationId: body.toLocationId,
        quantity: body.quantity,
        reason: body.reason,
        referenceId: transferId,
      },
    ]);

    await tx
      .update(inventoryLevels)
      .set({ stockedQuantity: fromStockedQuantity })
      .where(
        and(
          eq(inventoryLevels.inventoryItemId, body.inventoryItemId),
          eq(inventoryLevels.locationId, body.fromLocationId)
        )
      );

    if (destinationLevel) {
      await tx
        .update(inventoryLevels)
        .set({ stockedQuantity: toStockedQuantity })
        .where(
          and(
            eq(inventoryLevels.inventoryItemId, body.inventoryItemId),
            eq(inventoryLevels.locationId, body.toLocationId)
          )
        );
    } else {
      await tx.insert(inventoryLevels).values({
        inventoryItemId: body.inventoryItemId,
        locationId: body.toLocationId,
        stockedQuantity: toStockedQuantity,
      });
    }

    return {
      transferId,
      inventoryItemId: body.inventoryItemId,
      fromLocationId: body.fromLocationId,
      toLocationId: body.toLocationId,
      fromStockedQuantity,
      toStockedQuantity,
    };
  });
}

export async function listInventoryTransactions(
  query: ListInventoryTransactionsQuery
): Promise<{ data: InventoryTransactionListItem[]; meta: PaginationMeta }> {
  const filters = [];

  if (query.inventoryItemId) {
    filters.push(eq(inventoryTransactions.inventoryItemId, query.inventoryItemId));
  }

  if (query.locationId) {
    filters.push(eq(inventoryTransactions.locationId, query.locationId));
  }

  const orderBy =
    query.sortOrder === 'asc'
      ? asc(inventoryTransactions.createdAt)
      : desc(inventoryTransactions.createdAt);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: inventoryTransactions.id,
      inventoryItemId: inventoryTransactions.inventoryItemId,
      locationId: inventoryTransactions.locationId,
      locationName: stockLocations.name,
      quantity: inventoryTransactions.quantity,
      reason: inventoryTransactions.reason,
      referenceId: inventoryTransactions.referenceId,
      createdAt: inventoryTransactions.createdAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(inventoryTransactions)
    .innerJoin(stockLocations, eq(stockLocations.id, inventoryTransactions.locationId))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(orderBy, asc(inventoryTransactions.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const data: InventoryTransactionListItem[] = rows.map(({ totalCount: _, ...rest }) => rest);

  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      totalItems,
    },
  };
}
