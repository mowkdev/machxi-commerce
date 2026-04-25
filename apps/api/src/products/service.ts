import { db } from '@repo/database/client';
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  ne,
  or,
  sql,
} from '@repo/database';
import { languages, products, productTranslations } from '@repo/database/schema';
import type { PaginationMeta } from '@repo/types';
import type { ListProductsQuery, ProductListRow } from './schema';

const SORT_COLUMNS = {
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
  baseSku: products.baseSku,
  status: products.status,
} as const;

export async function listProducts(
  query: ListProductsQuery
): Promise<{ data: ProductListRow[]; meta: PaginationMeta }> {
  const defaultLangRow = await db
    .select({ code: languages.code })
    .from(languages)
    .where(eq(languages.isDefault, true))
    .limit(1);
  const defaultLang = defaultLangRow[0]?.code;

  const searchPattern = query.search ? `%${query.search}%` : undefined;

  const filters = and(
    ne(products.status, 'deleted'),
    query.status ? eq(products.status, query.status) : undefined,
    searchPattern
      ? or(
          ilike(products.baseSku, searchPattern),
          ilike(productTranslations.name, searchPattern)
        )
      : undefined
  );

  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const offset = (query.page - 1) * query.pageSize;

  // Single SQL aggregating count using a window function avoids a second
  // round-trip when the page is hot. For very large tables it can be split
  // into a separate cheap COUNT(*); we accept the trade-off here.
  const rows = await db
    .select({
      id: products.id,
      baseSku: products.baseSku,
      status: products.status,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      name: productTranslations.name,
      handle: productTranslations.handle,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(products)
    .leftJoin(
      productTranslations,
      defaultLang
        ? and(
            eq(productTranslations.productId, products.id),
            eq(productTranslations.languageCode, defaultLang)
          )
        : sql`false`
    )
    .where(filters)
    .orderBy(orderBy, asc(products.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

  const data: ProductListRow[] = rows.map(
    ({ totalCount: _totalCount, ...rest }) => rest
  );

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
