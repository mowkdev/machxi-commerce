// Admin currencies service: list, get, create, update flags / ordering.
//
// Safety rules enforced here (the FK alone can't):
//   - You may not deactivate the row currently flagged as default.
//   - You may not deactivate a currency that has any non-expired cart in it
//     (would strand customers mid-flow).
//   - Promoting a row to default atomically demotes the previous default,
//     respecting the `uk_currencies_single_default` partial unique index.

import { db } from "@repo/database/client";
import { and, asc, desc, eq, gt, ilike, or, sql } from "@repo/database";
import { carts, currencies } from "@repo/database/schema";
import type { PaginationMeta } from "@repo/types";
import type {
  CreateCurrencyBody,
  CurrencyDetail,
  CurrencyListItem,
  ListCurrenciesQuery,
  UpdateCurrencyBody,
} from "./schema";
import { conflict, notFound } from "../lib/errors";

function toListItem(row: typeof currencies.$inferSelect): CurrencyListItem {
  return {
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    decimalDigits: row.decimalDigits,
    isActive: row.isActive,
    isDefault: row.isDefault,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const SORT_COLUMNS = {
  code: currencies.code,
  name: currencies.name,
  isActive: currencies.isActive,
  isDefault: currencies.isDefault,
  displayOrder: currencies.displayOrder,
  createdAt: currencies.createdAt,
  updatedAt: currencies.updatedAt,
} as const;

export async function listCurrencies(
  query: ListCurrenciesQuery,
): Promise<{ data: CurrencyListItem[]; meta: PaginationMeta }> {
  const searchFilter = query.search
    ? or(
        ilike(currencies.code, `%${query.search}%`),
        ilike(currencies.name, `%${query.search}%`),
        ilike(currencies.symbol, `%${query.search}%`),
      )
    : undefined;

  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy =
    query.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      code: currencies.code,
      name: currencies.name,
      symbol: currencies.symbol,
      decimalDigits: currencies.decimalDigits,
      isActive: currencies.isActive,
      isDefault: currencies.isDefault,
      displayOrder: currencies.displayOrder,
      createdAt: currencies.createdAt,
      updatedAt: currencies.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(currencies)
    .where(searchFilter)
    .orderBy(orderBy, asc(currencies.code))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages =
    totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const data: CurrencyListItem[] = rows.map(({ totalCount: _, ...rest }) => rest);

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

export async function getCurrency(code: string): Promise<CurrencyDetail | null> {
  const target = code.toUpperCase();
  const [row] = await db
    .select()
    .from(currencies)
    .where(eq(currencies.code, target))
    .limit(1);
  return row ? toListItem(row) : null;
}

export async function createCurrency(
  body: CreateCurrencyBody,
): Promise<{ code: string }> {
  const code = body.code.trim().toUpperCase();
  const isDefault = body.isDefault ?? false;
  let isActive = body.isActive ?? true;
  if (isDefault) isActive = true;

  const [{ maxOrd }] = await db
    .select({
      maxOrd: sql<number>`coalesce(max(${currencies.displayOrder}), 0)`.mapWith(
        Number,
      ),
    })
    .from(currencies);

  const displayOrder = body.displayOrder ?? maxOrd + 10;

  await db.transaction(async (tx) => {
    if (isDefault) {
      await tx
        .update(currencies)
        .set({ isDefault: false })
        .where(eq(currencies.isDefault, true));
    }
    await tx.insert(currencies).values({
      code,
      name: body.name.trim(),
      symbol: body.symbol.trim(),
      decimalDigits: body.decimalDigits,
      isActive,
      isDefault,
      displayOrder,
    });
  });

  return { code };
}

export async function updateCurrency(
  code: string,
  body: UpdateCurrencyBody,
): Promise<CurrencyDetail> {
  const target = code.toUpperCase();
  const [current] = await db
    .select()
    .from(currencies)
    .where(eq(currencies.code, target))
    .limit(1);
  if (!current) throw notFound("Currency not found");

  // 1. Cannot deactivate the default currency. Operator must promote a new
  //    default first, then deactivate the old one.
  if (body.isActive === false && current.isDefault) {
    throw conflict("Cannot deactivate the default currency");
  }

  // 2. Cannot deactivate a currency that has any open (non-expired) cart in
  //    it — those carts would silently 400 on the next operation.
  if (body.isActive === false && current.isActive) {
    const nowIso = new Date().toISOString();
    const [openCart] = await db
      .select({ id: carts.id })
      .from(carts)
      .where(and(eq(carts.currencyCode, target), gt(carts.expiresAt, nowIso)))
      .limit(1);
    if (openCart) {
      throw conflict(
        "Cannot deactivate a currency with open carts — wait for them to expire or empty them first",
      );
    }
  }

  await db.transaction(async (tx) => {
    // Promoting to default: demote the existing default in the same TX so the
    // partial unique index (`uk_currencies_single_default`) never sees two
    // truthy rows.
    if (body.isDefault === true && !current.isDefault) {
      await tx
        .update(currencies)
        .set({ isDefault: false })
        .where(and(eq(currencies.isDefault, true), sql`${currencies.code} <> ${target}`));
      // Promoting to default also implicitly activates the row — a deactivated
      // default is a contradiction.
      await tx
        .update(currencies)
        .set({
          isDefault: true,
          isActive: true,
          ...(body.displayOrder !== undefined ? { displayOrder: body.displayOrder } : {}),
        })
        .where(eq(currencies.code, target));
      return;
    }

    if (body.isDefault === false && current.isDefault) {
      // We forbid clearing the only default — there must always be one.
      throw conflict(
        "Cannot clear default flag: promote another currency to default first",
      );
    }

    const update: Partial<typeof currencies.$inferInsert> = {};
    if (body.isActive !== undefined) update.isActive = body.isActive;
    if (body.displayOrder !== undefined) update.displayOrder = body.displayOrder;
    if (Object.keys(update).length > 0) {
      await tx.update(currencies).set(update).where(eq(currencies.code, target));
    }
  });

  const [refreshed] = await db
    .select()
    .from(currencies)
    .where(eq(currencies.code, target))
    .limit(1);
  if (!refreshed) throw notFound("Currency not found");
  return toListItem(refreshed);
}
