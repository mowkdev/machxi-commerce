import { db } from "@repo/database/client";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  or,
  sql,
} from "@repo/database";
import {
  fulfillmentItems,
  fulfillments,
  orderItems,
  orders,
  stockLocations,
} from "@repo/database/schema";
import type { PaginationMeta } from "@repo/types";
import type {
  CreateFulfillmentBody,
  CreateFulfillmentItemBody,
  FulfillmentDetail,
  FulfillmentItem,
  FulfillmentListItem,
  UpdateFulfillmentBody,
  UpdateFulfillmentItemBody,
} from "@repo/types/admin";
import type { ListFulfillmentsQuery } from "./schema";

const SORT_COLUMNS = {
  status: fulfillments.status,
  createdAt: fulfillments.createdAt,
  updatedAt: fulfillments.updatedAt,
} as const;

type FulfillmentTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeCreate(body: CreateFulfillmentBody) {
  return {
    orderId: body.orderId,
    locationId: body.locationId,
    status: body.status,
    trackingNum: nullableText(body.trackingNum),
    carrier: nullableText(body.carrier),
  };
}

function normalizeUpdate(body: UpdateFulfillmentBody) {
  const update: Partial<typeof fulfillments.$inferInsert> = {};
  if (body.locationId !== undefined) update.locationId = body.locationId;
  if (body.status !== undefined) update.status = body.status;
  if (body.trackingNum !== undefined) update.trackingNum = nullableText(body.trackingNum);
  if (body.carrier !== undefined) update.carrier = nullableText(body.carrier);
  return update;
}

async function assertFulfillmentItemIsValid(
  tx: FulfillmentTx,
  fulfillmentId: string,
  orderItemId: string,
  quantity: number,
) {
  const [fulfillment] = await tx
    .select({ id: fulfillments.id, orderId: fulfillments.orderId })
    .from(fulfillments)
    .where(eq(fulfillments.id, fulfillmentId))
    .limit(1);
  if (!fulfillment) return false;

  const [item] = await tx
    .select({ id: orderItems.id, quantity: orderItems.quantity })
    .from(orderItems)
    .where(
      and(eq(orderItems.id, orderItemId), eq(orderItems.orderId, fulfillment.orderId)),
    )
    .limit(1);
  if (!item) return false;
  if (quantity > item.quantity) {
    throw new Error("Fulfillment item quantity exceeds order item quantity.");
  }
  return true;
}

export async function listFulfillments(
  query: ListFulfillmentsQuery,
): Promise<{ data: FulfillmentListItem[]; meta: PaginationMeta }> {
  const filters = [];
  if (query.search) {
    filters.push(
      or(
        ilike(orders.displayId, `%${query.search}%`),
        ilike(fulfillments.trackingNum, `%${query.search}%`),
        ilike(fulfillments.carrier, `%${query.search}%`),
        ilike(stockLocations.name, `%${query.search}%`),
      ),
    );
  }
  if (query.status) filters.push(eq(fulfillments.status, query.status));
  if (query.orderId) filters.push(eq(fulfillments.orderId, query.orderId));
  if (query.locationId) filters.push(eq(fulfillments.locationId, query.locationId));

  const where = filters.length > 0 ? and(...filters) : undefined;
  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy =
    query.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: fulfillments.id,
      orderId: fulfillments.orderId,
      orderDisplayId: orders.displayId,
      locationId: fulfillments.locationId,
      locationName: stockLocations.name,
      status: fulfillments.status,
      trackingNum: fulfillments.trackingNum,
      carrier: fulfillments.carrier,
      createdAt: fulfillments.createdAt,
      updatedAt: fulfillments.updatedAt,
      itemCount: sql<number>`coalesce(count(${fulfillmentItems.orderItemId}), 0)`.mapWith(Number),
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(fulfillments)
    .leftJoin(orders, eq(fulfillments.orderId, orders.id))
    .leftJoin(stockLocations, eq(fulfillments.locationId, stockLocations.id))
    .leftJoin(fulfillmentItems, eq(fulfillmentItems.fulfillmentId, fulfillments.id))
    .where(where)
    .groupBy(fulfillments.id, orders.id, stockLocations.id)
    .orderBy(orderBy, asc(fulfillments.id))
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

export async function getFulfillment(id: string): Promise<FulfillmentDetail | null> {
  const [row] = await db
    .select({
      id: fulfillments.id,
      orderId: fulfillments.orderId,
      orderDisplayId: orders.displayId,
      locationId: fulfillments.locationId,
      locationName: stockLocations.name,
      status: fulfillments.status,
      trackingNum: fulfillments.trackingNum,
      carrier: fulfillments.carrier,
      createdAt: fulfillments.createdAt,
      updatedAt: fulfillments.updatedAt,
    })
    .from(fulfillments)
    .leftJoin(orders, eq(fulfillments.orderId, orders.id))
    .leftJoin(stockLocations, eq(fulfillments.locationId, stockLocations.id))
    .where(eq(fulfillments.id, id))
    .limit(1);
  if (!row) return null;

  const items = await db
    .select({
      fulfillmentId: fulfillmentItems.fulfillmentId,
      orderItemId: fulfillmentItems.orderItemId,
      quantity: fulfillmentItems.quantity,
      createdAt: fulfillmentItems.createdAt,
      orderItem: orderItems,
    })
    .from(fulfillmentItems)
    .leftJoin(orderItems, eq(fulfillmentItems.orderItemId, orderItems.id))
    .where(eq(fulfillmentItems.fulfillmentId, id));

  return { ...row, itemCount: items.length, items };
}

export async function createFulfillment(
  body: CreateFulfillmentBody,
): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(fulfillments)
      .values(normalizeCreate(body))
      .returning({ id: fulfillments.id });

    for (const item of body.items) {
      await assertFulfillmentItemIsValid(
        tx,
        created.id,
        item.orderItemId,
        item.quantity,
      );
      await tx.insert(fulfillmentItems).values({
        fulfillmentId: created.id,
        orderItemId: item.orderItemId,
        quantity: item.quantity,
      });
    }
    return { id: created.id };
  });
}

export async function updateFulfillment(
  id: string,
  body: UpdateFulfillmentBody,
): Promise<FulfillmentDetail | null> {
  const update = normalizeUpdate(body);
  if (Object.keys(update).length > 0) {
    const rows = await db
      .update(fulfillments)
      .set(update)
      .where(eq(fulfillments.id, id))
      .returning({ id: fulfillments.id });
    if (rows.length === 0) return null;
  }
  return getFulfillment(id);
}

export async function deleteFulfillment(id: string): Promise<boolean> {
  const rows = await db
    .delete(fulfillments)
    .where(eq(fulfillments.id, id))
    .returning({ id: fulfillments.id });
  return rows.length > 0;
}

export async function createFulfillmentItem(
  fulfillmentId: string,
  body: CreateFulfillmentItemBody,
): Promise<FulfillmentItem | null> {
  return db.transaction(async (tx) => {
    const valid = await assertFulfillmentItemIsValid(
      tx,
      fulfillmentId,
      body.orderItemId,
      body.quantity,
    );
    if (!valid) return null;
    const [row] = await tx
      .insert(fulfillmentItems)
      .values({ fulfillmentId, orderItemId: body.orderItemId, quantity: body.quantity })
      .returning();
    return { ...row, orderItem: null } as FulfillmentItem;
  });
}

export async function updateFulfillmentItem(
  fulfillmentId: string,
  orderItemId: string,
  body: UpdateFulfillmentItemBody,
): Promise<FulfillmentItem | null> {
  if (body.quantity !== undefined) {
    await db.transaction(async (tx) => {
      const valid = await assertFulfillmentItemIsValid(
        tx,
        fulfillmentId,
        orderItemId,
        body.quantity!,
      );
      if (!valid) throw new Error("Fulfillment item not found.");
    });
  }
  const [row] = await db
    .update(fulfillmentItems)
    .set(body)
    .where(
      and(
        eq(fulfillmentItems.fulfillmentId, fulfillmentId),
        eq(fulfillmentItems.orderItemId, orderItemId),
      ),
    )
    .returning();
  return row ? ({ ...row, orderItem: null } as FulfillmentItem) : null;
}

export async function deleteFulfillmentItem(
  fulfillmentId: string,
  orderItemId: string,
): Promise<boolean> {
  const rows = await db
    .delete(fulfillmentItems)
    .where(
      and(
        eq(fulfillmentItems.fulfillmentId, fulfillmentId),
        eq(fulfillmentItems.orderItemId, orderItemId),
      ),
    )
    .returning({ orderItemId: fulfillmentItems.orderItemId });
  return rows.length > 0;
}
