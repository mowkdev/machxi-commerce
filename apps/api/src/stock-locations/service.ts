import { db } from '@repo/database/client';
import { asc, desc, eq, ilike, sql } from '@repo/database';
import { stockLocations } from '@repo/database/schema';
import type { PaginationMeta } from '@repo/types';
import type {
  CreateStockLocationBody,
  ListStockLocationsQuery,
  StockLocationDetail,
  StockLocationListItem,
  UpdateStockLocationBody,
} from './schema';

const SORT_COLUMNS = {
  name: stockLocations.name,
  createdAt: stockLocations.createdAt,
  updatedAt: stockLocations.updatedAt,
} as const;

export async function listStockLocations(
  query: ListStockLocationsQuery
): Promise<{ data: StockLocationListItem[]; meta: PaginationMeta }> {
  const searchFilter = query.search
    ? ilike(stockLocations.name, `%${query.search}%`)
    : undefined;

  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: stockLocations.id,
      name: stockLocations.name,
      createdAt: stockLocations.createdAt,
      updatedAt: stockLocations.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(stockLocations)
    .where(searchFilter)
    .orderBy(orderBy, asc(stockLocations.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const data: StockLocationListItem[] = rows.map(({ totalCount: _, ...rest }) => rest);

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

export async function getStockLocation(id: string): Promise<StockLocationDetail | null> {
  const rows = await db
    .select()
    .from(stockLocations)
    .where(eq(stockLocations.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createStockLocation(body: CreateStockLocationBody): Promise<{ id: string }> {
  const [row] = await db
    .insert(stockLocations)
    .values({ name: body.name })
    .returning({ id: stockLocations.id });
  return { id: row.id };
}

export async function updateStockLocation(
  id: string,
  body: UpdateStockLocationBody
): Promise<StockLocationDetail | null> {
  const updateFields: Record<string, unknown> = {};
  if (body.name !== undefined) updateFields.name = body.name;

  if (Object.keys(updateFields).length === 0) {
    return getStockLocation(id);
  }

  const rows = await db
    .update(stockLocations)
    .set(updateFields)
    .where(eq(stockLocations.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteStockLocation(id: string): Promise<boolean> {
  const rows = await db
    .delete(stockLocations)
    .where(eq(stockLocations.id, id))
    .returning({ id: stockLocations.id });
  return rows.length > 0;
}
