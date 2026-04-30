import { db } from "@repo/database/client";
import { and, asc, desc, eq, ilike, sql } from "@repo/database";
import {
  orderItems,
  orders,
  returnItems,
  returns as orderReturns,
} from "@repo/database/schema";
import type { PaginationMeta } from "@repo/types";
import type {
  CreateReturnBody,
  CreateReturnItemBody,
  ReturnDetail,
  ReturnItem,
  ReturnListItem,
  UpdateReturnBody,
  UpdateReturnItemBody,
} from "@repo/types/admin";
import type { ListReturnsQuery } from "./schema";

const SORT_COLUMNS = {
  status: orderReturns.status,
  createdAt: orderReturns.createdAt,
  updatedAt: orderReturns.updatedAt,
} as const;

type ReturnTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function assertReturnItemIsValid(
  tx: ReturnTx,
  returnId: string,
  orderItemId: string,
  quantity: number,
) {
  const [orderReturn] = await tx
    .select({ id: orderReturns.id, orderId: orderReturns.orderId })
    .from(orderReturns)
    .where(eq(orderReturns.id, returnId))
    .limit(1);
  if (!orderReturn) return false;

  const [item] = await tx
    .select({ id: orderItems.id, quantity: orderItems.quantity })
    .from(orderItems)
    .where(
      and(eq(orderItems.id, orderItemId), eq(orderItems.orderId, orderReturn.orderId)),
    )
    .limit(1);
  if (!item) return false;
  if (quantity > item.quantity) {
    throw new Error("Return item quantity exceeds order item quantity.");
  }
  return true;
}

export async function listReturns(
  query: ListReturnsQuery,
): Promise<{ data: ReturnListItem[]; meta: PaginationMeta }> {
  const filters = [];
  if (query.search) {
    filters.push(ilike(orders.displayId, `%${query.search}%`));
  }
  if (query.status) filters.push(eq(orderReturns.status, query.status));
  if (query.orderId) filters.push(eq(orderReturns.orderId, query.orderId));

  const where = filters.length > 0 ? and(...filters) : undefined;
  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy =
    query.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: orderReturns.id,
      orderId: orderReturns.orderId,
      orderDisplayId: orders.displayId,
      status: orderReturns.status,
      createdAt: orderReturns.createdAt,
      updatedAt: orderReturns.updatedAt,
      itemCount: sql<number>`coalesce(count(${returnItems.id}), 0)`.mapWith(Number),
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(orderReturns)
    .leftJoin(orders, eq(orderReturns.orderId, orders.id))
    .leftJoin(returnItems, eq(returnItems.returnId, orderReturns.id))
    .where(where)
    .groupBy(orderReturns.id, orders.id)
    .orderBy(orderBy, asc(orderReturns.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  return {
    data: rows.map(({ totalCount, ...row }) => row),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
      totalItems,
    },
  };
}

export async function getReturn(id: string): Promise<ReturnDetail | null> {
  const [row] = await db
    .select({
      id: orderReturns.id,
      orderId: orderReturns.orderId,
      orderDisplayId: orders.displayId,
      status: orderReturns.status,
      createdAt: orderReturns.createdAt,
      updatedAt: orderReturns.updatedAt,
    })
    .from(orderReturns)
    .leftJoin(orders, eq(orderReturns.orderId, orders.id))
    .where(eq(orderReturns.id, id))
    .limit(1);
  if (!row) return null;

  const items = await db
    .select({
      id: returnItems.id,
      returnId: returnItems.returnId,
      orderItemId: returnItems.orderItemId,
      quantity: returnItems.quantity,
      reason: returnItems.reason,
      createdAt: returnItems.createdAt,
      orderItem: orderItems,
    })
    .from(returnItems)
    .leftJoin(orderItems, eq(returnItems.orderItemId, orderItems.id))
    .where(eq(returnItems.returnId, id));

  return { ...row, itemCount: items.length, items };
}

export async function createReturn(body: CreateReturnBody): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(orderReturns)
      .values({ orderId: body.orderId, status: body.status })
      .returning({ id: orderReturns.id });

    for (const item of body.items) {
      await assertReturnItemIsValid(tx, created.id, item.orderItemId, item.quantity);
      await tx.insert(returnItems).values({
        returnId: created.id,
        orderItemId: item.orderItemId,
        quantity: item.quantity,
        reason: item.reason ?? null,
      });
    }
    return { id: created.id };
  });
}

export async function updateReturn(
  id: string,
  body: UpdateReturnBody,
): Promise<ReturnDetail | null> {
  if (body.status !== undefined) {
    const rows = await db
      .update(orderReturns)
      .set({ status: body.status })
      .where(eq(orderReturns.id, id))
      .returning({ id: orderReturns.id });
    if (rows.length === 0) return null;
  }
  return getReturn(id);
}

export async function deleteReturn(id: string): Promise<boolean> {
  const rows = await db
    .delete(orderReturns)
    .where(eq(orderReturns.id, id))
    .returning({ id: orderReturns.id });
  return rows.length > 0;
}

export async function createReturnItem(
  returnId: string,
  body: CreateReturnItemBody,
): Promise<ReturnItem | null> {
  return db.transaction(async (tx) => {
    const valid = await assertReturnItemIsValid(
      tx,
      returnId,
      body.orderItemId,
      body.quantity,
    );
    if (!valid) return null;
    const [row] = await tx
      .insert(returnItems)
      .values({
        returnId,
        orderItemId: body.orderItemId,
        quantity: body.quantity,
        reason: body.reason ?? null,
      })
      .returning();
    return { ...row, orderItem: null } as ReturnItem;
  });
}

export async function updateReturnItem(
  returnId: string,
  itemId: string,
  body: UpdateReturnItemBody,
): Promise<ReturnItem | null> {
  const current = await db
    .select()
    .from(returnItems)
    .where(and(eq(returnItems.returnId, returnId), eq(returnItems.id, itemId)))
    .limit(1);
  if (!current[0]) return null;

  if (body.quantity !== undefined) {
    await db.transaction(async (tx) => {
      await assertReturnItemIsValid(
        tx,
        returnId,
        current[0].orderItemId,
        body.quantity!,
      );
    });
  }

  const [row] = await db
    .update(returnItems)
    .set({
      quantity: body.quantity ?? current[0].quantity,
      reason: body.reason === undefined ? current[0].reason : body.reason,
    })
    .where(and(eq(returnItems.returnId, returnId), eq(returnItems.id, itemId)))
    .returning();
  return row ? ({ ...row, orderItem: null } as ReturnItem) : null;
}

export async function deleteReturnItem(
  returnId: string,
  itemId: string,
): Promise<boolean> {
  const rows = await db
    .delete(returnItems)
    .where(and(eq(returnItems.returnId, returnId), eq(returnItems.id, itemId)))
    .returning({ id: returnItems.id });
  return rows.length > 0;
}
