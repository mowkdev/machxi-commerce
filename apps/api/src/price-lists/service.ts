import { db } from '@repo/database/client';
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from '@repo/database';
import {
  priceListPrices,
  priceLists,
  priceListTranslations,
  prices,
  products,
  productTranslations,
  productVariants,
} from '@repo/database/schema';
import type { PaginationMeta } from '@repo/types';
import type {
  CreatePriceListBody,
  CreatePriceListPriceBody,
  CreatePriceListTranslationBody,
  PriceListDetail,
  PriceListListItem,
  PriceListPrice,
  PriceListTranslation,
  PriceSetTarget,
  UpdatePriceListBody,
  UpdatePriceListPriceBody,
  UpdatePriceListTranslationBody,
} from '@repo/types/admin';
import type { ListPriceListsQuery, ListPriceSetTargetsQuery } from './schema';

type PriceListTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const SORT_COLUMNS = {
  name: priceListTranslations.name,
  status: priceLists.status,
  type: priceLists.type,
  startsAt: priceLists.startsAt,
  endsAt: priceLists.endsAt,
  createdAt: priceLists.createdAt,
  updatedAt: priceLists.updatedAt,
} as const;

const TARGET_SORT_COLUMNS = {
  productName: productTranslations.name,
  sku: productVariants.sku,
  createdAt: productVariants.createdAt,
} as const;

export class PriceListValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PriceListValidationError';
  }
}

function normalizeDate(value: string | null | undefined): string | null | undefined {
  return value === undefined ? undefined : value || null;
}

function normalizeCurrencyCode(currencyCode: string): string {
  return currencyCode.trim().toUpperCase();
}

function normalizeCreatePriceListPrice(price: CreatePriceListPriceBody) {
  return {
    priceSetId: price.priceSetId,
    currencyCode: normalizeCurrencyCode(price.currencyCode),
    amount: price.amount,
    minQuantity: price.minQuantity,
  };
}

async function priceListExists(id: string): Promise<boolean> {
  const rows = await db
    .select({ id: priceLists.id })
    .from(priceLists)
    .where(eq(priceLists.id, id))
    .limit(1);
  return rows.length > 0;
}

async function assertBasePriceExists(
  tx: PriceListTx,
  price: Pick<CreatePriceListPriceBody, 'priceSetId' | 'currencyCode' | 'minQuantity'>
) {
  const rows = await tx
    .select({ id: prices.id })
    .from(prices)
    .where(
      and(
        eq(prices.priceSetId, price.priceSetId),
        eq(prices.currencyCode, normalizeCurrencyCode(price.currencyCode)),
        eq(prices.minQuantity, price.minQuantity)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    throw new PriceListValidationError(
      'Price list prices must target an existing base price for the same price set, currency, and minimum quantity.'
    );
  }
}

async function upsertTranslations(
  tx: PriceListTx,
  priceListId: string,
  translations: CreatePriceListBody['translations']
) {
  await tx
    .insert(priceListTranslations)
    .values(
      translations.map((translation) => ({
        priceListId,
        languageCode: translation.languageCode,
        name: translation.name,
        description: translation.description ?? null,
      }))
    )
    .onConflictDoUpdate({
      target: [priceListTranslations.priceListId, priceListTranslations.languageCode],
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
      },
    });
}

export async function listPriceLists(
  query: ListPriceListsQuery
): Promise<{ data: PriceListListItem[]; meta: PaginationMeta }> {
  const searchFilter = query.search
    ? ilike(priceListTranslations.name, `%${query.search}%`)
    : undefined;
  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: priceLists.id,
      status: priceLists.status,
      type: priceLists.type,
      name: priceListTranslations.name,
      description: priceListTranslations.description,
      startsAt: priceLists.startsAt,
      endsAt: priceLists.endsAt,
      priceCount: sql<number>`(
        select count(*) from ${priceListPrices}
        where ${priceListPrices.priceListId} = ${priceLists.id}
      )`.mapWith(Number),
      createdAt: priceLists.createdAt,
      updatedAt: priceLists.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(priceLists)
    .innerJoin(
      priceListTranslations,
      and(
        eq(priceListTranslations.priceListId, priceLists.id),
        eq(priceListTranslations.languageCode, query.languageCode)
      )
    )
    .where(and(query.status ? eq(priceLists.status, query.status) : undefined, query.type ? eq(priceLists.type, query.type) : undefined, searchFilter))
    .orderBy(orderBy, asc(priceLists.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const data: PriceListListItem[] = rows.map(({ totalCount: _totalCount, ...row }) => row);

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

export async function getPriceList(id: string): Promise<PriceListDetail | null> {
  const rows = await db.select().from(priceLists).where(eq(priceLists.id, id)).limit(1);
  const priceList = rows[0];
  if (!priceList) return null;

  const [translations, listPrices] = await Promise.all([
    listPriceListTranslations(id),
    listPriceListPrices(id),
  ]);

  return {
    ...priceList,
    translations: translations ?? [],
    prices: listPrices ?? [],
  };
}

export async function createPriceList(body: CreatePriceListBody): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [priceList] = await tx
      .insert(priceLists)
      .values({
        status: body.status,
        type: body.type,
        startsAt: body.startsAt ?? null,
        endsAt: body.endsAt ?? null,
      })
      .returning({ id: priceLists.id });

    await upsertTranslations(tx, priceList.id, body.translations);

    for (const price of body.prices) {
      await assertBasePriceExists(tx, price);
    }

    if (body.prices.length > 0) {
      await tx.insert(priceListPrices).values(
        body.prices.map((price) => ({
          priceListId: priceList.id,
          ...normalizeCreatePriceListPrice(price),
        }))
      );
    }

    return { id: priceList.id };
  });
}

export async function updatePriceList(
  id: string,
  body: UpdatePriceListBody
): Promise<PriceListDetail | null> {
  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(priceLists).where(eq(priceLists.id, id)).limit(1);
    if (!existing) return null;

    const updateFields: Partial<typeof priceLists.$inferInsert> = {};
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.type !== undefined) updateFields.type = body.type;
    if (body.startsAt !== undefined) updateFields.startsAt = normalizeDate(body.startsAt);
    if (body.endsAt !== undefined) updateFields.endsAt = normalizeDate(body.endsAt);

    if (Object.keys(updateFields).length > 0) {
      await tx.update(priceLists).set(updateFields).where(eq(priceLists.id, id));
    }

    if (body.translations) {
      await upsertTranslations(tx, id, body.translations);
    }

    return { id };
  });

  if (!updated) return null;
  return getPriceList(id);
}

export async function deletePriceList(id: string): Promise<boolean> {
  const rows = await db
    .delete(priceLists)
    .where(eq(priceLists.id, id))
    .returning({ id: priceLists.id });
  return rows.length > 0;
}

export async function listPriceListTranslations(
  priceListId: string
): Promise<PriceListTranslation[] | null> {
  if (!(await priceListExists(priceListId))) return null;

  return db
    .select()
    .from(priceListTranslations)
    .where(eq(priceListTranslations.priceListId, priceListId))
    .orderBy(asc(priceListTranslations.languageCode));
}

export async function createPriceListTranslation(
  priceListId: string,
  body: CreatePriceListTranslationBody
): Promise<PriceListTranslation | null> {
  if (!(await priceListExists(priceListId))) return null;

  const [row] = await db
    .insert(priceListTranslations)
    .values({
      priceListId,
      languageCode: body.languageCode,
      name: body.name,
      description: body.description ?? null,
    })
    .returning();
  return row;
}

export async function updatePriceListTranslation(
  priceListId: string,
  translationId: string,
  body: UpdatePriceListTranslationBody
): Promise<PriceListTranslation | null> {
  const updateFields: Partial<typeof priceListTranslations.$inferInsert> = {};
  if (body.languageCode !== undefined) updateFields.languageCode = body.languageCode;
  if (body.name !== undefined) updateFields.name = body.name;
  if (body.description !== undefined) updateFields.description = body.description ?? null;

  if (Object.keys(updateFields).length === 0) {
    return getPriceListTranslation(priceListId, translationId);
  }

  const rows = await db
    .update(priceListTranslations)
    .set(updateFields)
    .where(
      and(
        eq(priceListTranslations.priceListId, priceListId),
        eq(priceListTranslations.id, translationId)
      )
    )
    .returning();
  return rows[0] ?? null;
}

export async function deletePriceListTranslation(
  priceListId: string,
  translationId: string
): Promise<boolean> {
  const rows = await db
    .delete(priceListTranslations)
    .where(
      and(
        eq(priceListTranslations.priceListId, priceListId),
        eq(priceListTranslations.id, translationId)
      )
    )
    .returning({ id: priceListTranslations.id });
  return rows.length > 0;
}

export async function listPriceListPrices(priceListId: string): Promise<PriceListPrice[] | null> {
  if (!(await priceListExists(priceListId))) return null;

  return db
    .select()
    .from(priceListPrices)
    .where(eq(priceListPrices.priceListId, priceListId))
    .orderBy(asc(priceListPrices.currencyCode), asc(priceListPrices.minQuantity));
}

export async function createPriceListPrice(
  priceListId: string,
  body: CreatePriceListPriceBody
): Promise<PriceListPrice | null> {
  return db.transaction(async (tx) => {
    const [list] = await tx
      .select({ id: priceLists.id })
      .from(priceLists)
      .where(eq(priceLists.id, priceListId))
      .limit(1);
    if (!list) return null;

    const normalized = normalizeCreatePriceListPrice(body);
    await assertBasePriceExists(tx, normalized);

    const [row] = await tx
      .insert(priceListPrices)
      .values({ priceListId, ...normalized })
      .returning();
    return row;
  });
}

export async function updatePriceListPrice(
  priceListId: string,
  priceId: string,
  body: UpdatePriceListPriceBody
): Promise<PriceListPrice | null> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(priceListPrices)
      .where(and(eq(priceListPrices.priceListId, priceListId), eq(priceListPrices.id, priceId)))
      .limit(1);
    if (!existing) return null;

    const next = {
      priceSetId: body.priceSetId ?? existing.priceSetId,
      currencyCode: normalizeCurrencyCode(body.currencyCode ?? existing.currencyCode),
      minQuantity: body.minQuantity ?? existing.minQuantity,
      amount: body.amount ?? existing.amount,
    };

    await assertBasePriceExists(tx, next);

    const updateFields: Partial<typeof priceListPrices.$inferInsert> = {};
    if (body.priceSetId !== undefined) updateFields.priceSetId = body.priceSetId;
    if (body.currencyCode !== undefined) updateFields.currencyCode = normalizeCurrencyCode(body.currencyCode);
    if (body.minQuantity !== undefined) updateFields.minQuantity = body.minQuantity;
    if (body.amount !== undefined) updateFields.amount = body.amount;

    if (Object.keys(updateFields).length === 0) return existing;

    const [row] = await tx
      .update(priceListPrices)
      .set(updateFields)
      .where(and(eq(priceListPrices.priceListId, priceListId), eq(priceListPrices.id, priceId)))
      .returning();
    return row ?? null;
  });
}

export async function deletePriceListPrice(
  priceListId: string,
  priceId: string
): Promise<boolean> {
  const rows = await db
    .delete(priceListPrices)
    .where(and(eq(priceListPrices.priceListId, priceListId), eq(priceListPrices.id, priceId)))
    .returning({ id: priceListPrices.id });
  return rows.length > 0;
}

export async function listPriceSetTargets(
  query: ListPriceSetTargetsQuery
): Promise<{ data: PriceSetTarget[]; meta: PaginationMeta }> {
  const searchPattern = query.search ? `%${query.search}%` : undefined;
  const sortColumn = TARGET_SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      priceSetId: productVariants.priceSetId,
      productId: products.id,
      productName: productTranslations.name,
      productHandle: productTranslations.handle,
      variantId: productVariants.id,
      sku: productVariants.sku,
      status: productVariants.status,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(
      productTranslations,
      and(
        eq(productTranslations.productId, products.id),
        eq(productTranslations.languageCode, query.languageCode)
      )
    )
    .where(
      and(
        ne(products.status, 'deleted'),
        ne(productVariants.status, 'deleted'),
        searchPattern
          ? or(ilike(productTranslations.name, searchPattern), ilike(productVariants.sku, searchPattern))
          : undefined
      )
    )
    .orderBy(orderBy, asc(productVariants.id))
    .limit(query.pageSize)
    .offset(offset);

  const priceSetIds = rows.map((row) => row.priceSetId);
  const priceRows =
    priceSetIds.length > 0
      ? await db
          .select({
            priceSetId: prices.priceSetId,
            currencyCode: prices.currencyCode,
            amount: prices.amount,
            compareAtAmount: prices.compareAtAmount,
            minQuantity: prices.minQuantity,
            taxInclusive: prices.taxInclusive,
          })
          .from(prices)
          .where(inArray(prices.priceSetId, priceSetIds))
          .orderBy(asc(prices.currencyCode), asc(prices.minQuantity))
      : [];

  const pricesBySet = new Map<string, PriceSetTarget['basePrices']>();
  for (const price of priceRows) {
    const current = pricesBySet.get(price.priceSetId) ?? [];
    current.push({
      currencyCode: price.currencyCode,
      amount: price.amount,
      compareAtAmount: price.compareAtAmount,
      minQuantity: price.minQuantity,
      taxInclusive: price.taxInclusive,
    });
    pricesBySet.set(price.priceSetId, current);
  }

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const data: PriceSetTarget[] = rows.map(({ totalCount: _totalCount, ...row }) => ({
    ...row,
    basePrices: pricesBySet.get(row.priceSetId) ?? [],
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

async function getPriceListTranslation(
  priceListId: string,
  translationId: string
): Promise<PriceListTranslation | null> {
  const rows = await db
    .select()
    .from(priceListTranslations)
    .where(
      and(
        eq(priceListTranslations.priceListId, priceListId),
        eq(priceListTranslations.id, translationId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}
