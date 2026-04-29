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
  InventoryAdjustmentResult,
  InventoryLevelListItem,
  InventoryTransactionListItem,
  ListInventoryQuery,
  ListInventoryTransactionsQuery,
} from './schema';

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

  const stockedQuantity = sql<number>`coalesce(${inventoryLevels.stockedQuantity}, 0)`.mapWith(Number);
  const updatedAt = sql<string>`coalesce(${inventoryLevels.updatedAt}, ${productVariants.updatedAt})`;
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
      updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .innerJoin(inventoryItems, eq(inventoryItems.id, productVariants.inventoryItemId))
    .innerJoin(stockLocations, sql`true`)
    .leftJoin(
      productTranslations,
      and(
        eq(productTranslations.productId, products.id),
        eq(productTranslations.languageCode, 'en')
      )
    )
    .leftJoin(
      inventoryLevels,
      and(
        eq(inventoryLevels.inventoryItemId, inventoryItems.id),
        eq(inventoryLevels.locationId, stockLocations.id)
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
