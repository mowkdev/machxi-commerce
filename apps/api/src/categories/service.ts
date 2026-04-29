import { db } from '@repo/database/client';
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from '@repo/database';
import { categories, categoryTranslations } from '@repo/database/schema';
import type { PaginationMeta } from '@repo/types';
import type {
  CategoryDetail,
  CategoryListItem,
  CreateCategoryBody,
  UpdateCategoryBody,
} from '@repo/types/admin';
import type { ListCategoriesQuery } from './schema';

const SORT_COLUMNS = {
  name: categoryTranslations.name,
  handle: categoryTranslations.handle,
  rank: categories.rank,
  createdAt: categories.createdAt,
  updatedAt: categories.updatedAt,
} as const;

type CategoryTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function getNextRank(
  tx: CategoryTx,
  parentId: string | null,
  excludeId?: string
): Promise<number> {
  const parentFilter =
    parentId === null ? sql`${categories.parentId} IS NULL` : eq(categories.parentId, parentId);
  const excludeFilter = excludeId ? ne(categories.id, excludeId) : undefined;
  const [row] = await tx
    .select({
      nextRank: sql<number>`coalesce(max(${categories.rank}), 0) + 1`.mapWith(Number),
    })
    .from(categories)
    .where(and(parentFilter, excludeFilter));

  return row?.nextRank ?? 1;
}

async function getParentNameMap(
  parentIds: Array<string | null>,
  languageCode: string
): Promise<Map<string, string>> {
  const ids = Array.from(new Set(parentIds.filter((id): id is string => Boolean(id))));
  if (ids.length === 0) return new Map();

  const rows = await db
    .select({
      id: categories.id,
      name: categoryTranslations.name,
    })
    .from(categories)
    .innerJoin(
      categoryTranslations,
      and(
        eq(categoryTranslations.categoryId, categories.id),
        eq(categoryTranslations.languageCode, languageCode)
      )
    )
    .where(inArray(categories.id, ids));

  return new Map(rows.map((row) => [row.id, row.name]));
}

async function upsertTranslations(
  tx: CategoryTx,
  categoryId: string,
  translations: CreateCategoryBody['translations']
) {
  await tx
    .insert(categoryTranslations)
    .values(
      translations.map((translation) => ({
        categoryId,
        languageCode: translation.languageCode,
        name: translation.name,
        description: translation.description ?? null,
        handle: translation.handle,
      }))
    )
    .onConflictDoUpdate({
      target: [categoryTranslations.categoryId, categoryTranslations.languageCode],
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        handle: sql`excluded.handle`,
      },
    });
}

export async function listCategories(
  query: ListCategoriesQuery
): Promise<{ data: CategoryListItem[]; meta: PaginationMeta }> {
  const searchFilter = query.search
    ? or(
        ilike(categoryTranslations.name, `%${query.search}%`),
        ilike(categoryTranslations.handle, `%${query.search}%`)
      )
    : undefined;

  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      name: categoryTranslations.name,
      handle: categoryTranslations.handle,
      isActive: categories.isActive,
      rank: categories.rank,
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(categories)
    .innerJoin(
      categoryTranslations,
      and(
        eq(categoryTranslations.categoryId, categories.id),
        eq(categoryTranslations.languageCode, query.languageCode)
      )
    )
    .where(searchFilter)
    .orderBy(orderBy, asc(categories.id))
    .limit(query.pageSize)
    .offset(offset);

  const parentNameMap = await getParentNameMap(
    rows.map((row) => row.parentId),
    query.languageCode
  );
  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

  const data: CategoryListItem[] = rows.map(({ totalCount: _, ...row }) => ({
    ...row,
    parentName: row.parentId ? parentNameMap.get(row.parentId) ?? null : null,
  }));

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

export async function getCategory(
  id: string,
  languageCode = 'en'
): Promise<CategoryDetail | null> {
  const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  const category = rows[0];
  if (!category) return null;

  const translations = await db
    .select()
    .from(categoryTranslations)
    .where(eq(categoryTranslations.categoryId, id))
    .orderBy(asc(categoryTranslations.languageCode));

  const parentNameMap = await getParentNameMap([category.parentId], languageCode);

  return {
    ...category,
    parentName: category.parentId ? parentNameMap.get(category.parentId) ?? null : null,
    translations,
  };
}

export async function createCategory(body: CreateCategoryBody): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const parentId = body.parentId ?? null;
    const rank = body.rank ?? (await getNextRank(tx, parentId));
    const [category] = await tx
      .insert(categories)
      .values({
        parentId,
        isActive: body.isActive,
        rank,
      })
      .returning({ id: categories.id });

    await upsertTranslations(tx, category.id, body.translations);

    return { id: category.id };
  });
}

export async function updateCategory(
  id: string,
  body: UpdateCategoryBody
): Promise<CategoryDetail | null> {
  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!existing) return null;

    const updateFields: Partial<{
      parentId: string | null;
      isActive: boolean;
      rank: number;
    }> = {};

    if (body.parentId !== undefined) updateFields.parentId = body.parentId;
    if (body.isActive !== undefined) updateFields.isActive = body.isActive;
    if (body.rank !== undefined) updateFields.rank = body.rank;
    if (body.parentId !== undefined && body.rank === undefined && body.parentId !== existing.parentId) {
      updateFields.rank = await getNextRank(tx, body.parentId, id);
    }

    const categoryRows =
      Object.keys(updateFields).length > 0
        ? await tx
            .update(categories)
            .set(updateFields)
            .where(eq(categories.id, id))
            .returning({ id: categories.id })
        : await tx.select({ id: categories.id }).from(categories).where(eq(categories.id, id));

    if (categoryRows.length === 0) return null;

    if (body.translations) {
      await upsertTranslations(tx, id, body.translations);
    }

    return categoryRows[0];
  });

  if (!updated) return null;
  return getCategory(id);
}

export async function deleteCategory(id: string): Promise<boolean> {
  const rows = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  return rows.length > 0;
}
