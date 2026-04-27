import { db } from '@repo/database/client';
import { asc, desc, eq, ilike, sql } from '@repo/database';
import { taxClasses } from '@repo/database/schema';
import type { PaginationMeta } from '@repo/types';
import type { CreateTaxClassBody, UpdateTaxClassBody, TaxClassListItem, TaxClassDetail } from './schema';
import type { ListTaxClassesQuery } from './schema';

const SORT_COLUMNS = {
  name: taxClasses.name,
  createdAt: taxClasses.createdAt,
  updatedAt: taxClasses.updatedAt,
} as const;

export async function listTaxClasses(
  query: ListTaxClassesQuery
): Promise<{ data: TaxClassListItem[]; meta: PaginationMeta }> {
  const searchFilter = query.search
    ? ilike(taxClasses.name, `%${query.search}%`)
    : undefined;

  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: taxClasses.id,
      name: taxClasses.name,
      createdAt: taxClasses.createdAt,
      updatedAt: taxClasses.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(taxClasses)
    .where(searchFilter)
    .orderBy(orderBy, asc(taxClasses.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

  const data: TaxClassListItem[] = rows.map(({ totalCount: _, ...rest }) => rest);

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

export async function getTaxClass(id: string): Promise<TaxClassDetail | null> {
  const rows = await db
    .select()
    .from(taxClasses)
    .where(eq(taxClasses.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createTaxClass(body: CreateTaxClassBody): Promise<{ id: string }> {
  const [row] = await db
    .insert(taxClasses)
    .values({ name: body.name })
    .returning({ id: taxClasses.id });
  return { id: row.id };
}

export async function updateTaxClass(
  id: string,
  body: UpdateTaxClassBody
): Promise<TaxClassDetail | null> {
  const updateFields: Record<string, unknown> = {};
  if (body.name !== undefined) updateFields.name = body.name;

  if (Object.keys(updateFields).length === 0) {
    return getTaxClass(id);
  }

  const rows = await db
    .update(taxClasses)
    .set(updateFields)
    .where(eq(taxClasses.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteTaxClass(id: string): Promise<boolean> {
  const rows = await db
    .delete(taxClasses)
    .where(eq(taxClasses.id, id))
    .returning({ id: taxClasses.id });
  return rows.length > 0;
}
