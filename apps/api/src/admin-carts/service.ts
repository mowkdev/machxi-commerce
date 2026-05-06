import { db } from "@repo/database/client";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "@repo/database";
import {
  addresses,
  cartItems,
  carts,
  customers,
} from "@repo/database/schema";
import type { PaginationMeta } from "@repo/types";
import type { AdminCartDetail, AdminCartListItem } from "@repo/types/admin";
import { loadCart } from "../store-carts/query";
import { releaseForCartItem } from "../store-carts/inventory";
import type { ListCartsQuery } from "./schema";

const SORT_COLUMNS = {
  createdAt: carts.createdAt,
  updatedAt: carts.updatedAt,
  expiresAt: carts.expiresAt,
} as const;

export async function listCarts(
  query: ListCartsQuery,
): Promise<{ data: AdminCartListItem[]; meta: PaginationMeta }> {
  const filters = [];
  if (query.search) {
    filters.push(
      or(
        ilike(carts.id, `%${query.search}%`),
        ilike(customers.email, `%${query.search}%`),
        ilike(customers.firstName, `%${query.search}%`),
        ilike(customers.lastName, `%${query.search}%`),
      ),
    );
  }
  if (query.status === "active") {
    filters.push(gt(carts.expiresAt, sql`now()`));
  } else if (query.status === "expired") {
    filters.push(lte(carts.expiresAt, sql`now()`));
  }
  if (query.customerType === "guest") {
    filters.push(isNull(carts.customerId));
  } else if (query.customerType === "registered") {
    filters.push(isNotNull(carts.customerId));
  }

  const where = filters.length > 0 ? and(...filters) : undefined;
  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: carts.id,
      customerId: carts.customerId,
      customerEmail: customers.email,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      currencyCode: carts.currencyCode,
      expiresAt: carts.expiresAt,
      createdAt: carts.createdAt,
      updatedAt: carts.updatedAt,
      itemCount: sql<number>`coalesce(count(distinct ${cartItems.id}), 0)`.mapWith(Number),
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(carts)
    .leftJoin(customers, eq(carts.customerId, customers.id))
    .leftJoin(cartItems, eq(cartItems.cartId, carts.id))
    .where(where)
    .groupBy(carts.id, customers.id)
    .orderBy(orderBy, asc(carts.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const now = new Date().toISOString();

  return {
    data: rows.map(({ customerFirstName, customerLastName, totalCount, ...row }) => ({
      ...row,
      customerName:
        customerFirstName || customerLastName
          ? `${customerFirstName ?? ""} ${customerLastName ?? ""}`.trim()
          : null,
      subtotal: 0,
      total: 0,
      isExpired: row.expiresAt <= now,
    })),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      totalItems,
    },
  };
}

export async function getCart(id: string): Promise<AdminCartDetail | null> {
  const [cartRow] = await db
    .select({
      id: carts.id,
      customerId: carts.customerId,
      currencyCode: carts.currencyCode,
      shippingAddressId: carts.shippingAddressId,
      billingAddressId: carts.billingAddressId,
      expiresAt: carts.expiresAt,
      createdAt: carts.createdAt,
      updatedAt: carts.updatedAt,
      customerEmail: customers.email,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
    })
    .from(carts)
    .leftJoin(customers, eq(carts.customerId, customers.id))
    .where(eq(carts.id, id))
    .limit(1);

  if (!cartRow) return null;

  const projected = await loadCart(id);

  const [shippingAddress, billingAddress] = await Promise.all([
    cartRow.shippingAddressId
      ? db.select().from(addresses).where(eq(addresses.id, cartRow.shippingAddressId)).limit(1).then((r) => r[0] ?? null)
      : Promise.resolve(null),
    cartRow.billingAddressId
      ? db.select().from(addresses).where(eq(addresses.id, cartRow.billingAddressId)).limit(1).then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  const now = new Date().toISOString();
  const customerName =
    cartRow.customerFirstName || cartRow.customerLastName
      ? `${cartRow.customerFirstName ?? ""} ${cartRow.customerLastName ?? ""}`.trim()
      : null;

  return {
    id: cartRow.id,
    customerId: cartRow.customerId,
    customerEmail: cartRow.customerEmail,
    customerName,
    currencyCode: cartRow.currencyCode,
    itemCount: projected?.items.length ?? 0,
    subtotal: projected?.totals.subtotal ?? 0,
    total: projected?.totals.total ?? 0,
    isExpired: cartRow.expiresAt <= now,
    expiresAt: cartRow.expiresAt,
    createdAt: cartRow.createdAt,
    updatedAt: cartRow.updatedAt,
    shippingAddress,
    billingAddress,
    items: projected?.items ?? [],
    promotions: projected?.promotions ?? [],
    totals: projected?.totals ?? { subtotal: 0, discountTotal: 0, shippingTotal: 0, taxTotal: 0, total: 0 },
  };
}

export async function expireCart(id: string): Promise<AdminCartDetail | null> {
  const [cartRow] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.id, id))
    .limit(1);

  if (!cartRow) return null;

  await db.transaction(async (tx) => {
    const items = await tx
      .select({ id: cartItems.id })
      .from(cartItems)
      .where(eq(cartItems.cartId, id));

    for (const item of items) {
      await releaseForCartItem(tx, item.id);
    }

    await tx
      .update(carts)
      .set({ expiresAt: new Date().toISOString() })
      .where(eq(carts.id, id));
  });

  return getCart(id);
}
