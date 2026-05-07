import { db } from "@repo/database/client";
import { asc, desc, eq, ilike, or, sql } from "@repo/database";
import { paymentProviders } from "@repo/database/schema";
import type { PaginationMeta } from "@repo/types";
import type {
  CreatePaymentProviderBody,
  PaymentProviderDetail,
  PaymentProviderListItem,
  UpdatePaymentProviderBody,
} from "@repo/types/admin";
import { getBuiltInPaymentProvider } from "../payments/providers/registry";
import { stripeSecretConfigured } from "../payments/providers/stripe";
import type { ListPaymentProvidersQuery } from "./schema";

const SORT_COLUMNS = {
  code: paymentProviders.code,
  name: paymentProviders.name,
  displayOrder: paymentProviders.displayOrder,
  createdAt: paymentProviders.createdAt,
  updatedAt: paymentProviders.updatedAt,
} as const;

function mapConfig(config: unknown): Record<string, unknown> {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return {};
}

function assertCanEnable(opts: {
  code: string;
  kind: "automatic" | "manual";
  isEnabled: boolean;
}): void {
  if (!opts.isEnabled) return;
  if (opts.kind === "automatic" && opts.code === "stripe" && !stripeSecretConfigured()) {
    const err = new Error(
      "Cannot enable Stripe: STRIPE_SECRET_KEY is not set on the API server.",
    );
    (err as Error & { statusCode?: number }).statusCode = 422;
    throw err;
  }
}

function assertKnownProviderCode(code: string): void {
  if (!getBuiltInPaymentProvider(code)) {
    const err = new Error(
      `Unknown payment provider code "${code}". Only built-in providers can be created.`,
    );
    (err as Error & { statusCode?: number }).statusCode = 422;
    throw err;
  }
}

function toListItem(row: typeof paymentProviders.$inferSelect): PaymentProviderListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? null,
    kind: row.kind,
    isEnabled: row.isEnabled,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDetail(row: typeof paymentProviders.$inferSelect): PaymentProviderDetail {
  return {
    ...toListItem(row),
    config: mapConfig(row.config),
  };
}

export async function listPaymentProviders(
  query: ListPaymentProvidersQuery,
): Promise<{ data: PaymentProviderListItem[]; meta: PaginationMeta }> {
  const searchFilter = query.search
    ? or(
        ilike(paymentProviders.code, `%${query.search}%`),
        ilike(paymentProviders.name, `%${query.search}%`),
      )
    : undefined;

  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy =
    query.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: paymentProviders.id,
      code: paymentProviders.code,
      name: paymentProviders.name,
      description: paymentProviders.description,
      kind: paymentProviders.kind,
      isEnabled: paymentProviders.isEnabled,
      displayOrder: paymentProviders.displayOrder,
      createdAt: paymentProviders.createdAt,
      updatedAt: paymentProviders.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(paymentProviders)
    .where(searchFilter)
    .orderBy(orderBy, asc(paymentProviders.code))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages =
    totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

  return {
    data: rows.map(({ totalCount: _, ...r }) =>
      toListItem(r as typeof paymentProviders.$inferSelect),
    ),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      totalItems,
    },
  };
}

export async function getPaymentProvider(
  id: string,
): Promise<PaymentProviderDetail | null> {
  const rows = await db
    .select()
    .from(paymentProviders)
    .where(eq(paymentProviders.id, id))
    .limit(1);
  const row = rows[0];
  return row ? toDetail(row) : null;
}

export async function createPaymentProvider(
  body: CreatePaymentProviderBody,
): Promise<{ id: string }> {
  assertKnownProviderCode(body.code);
  assertCanEnable({
    code: body.code,
    kind: body.kind,
    isEnabled: body.isEnabled ?? false,
  });

  const [row] = await db
    .insert(paymentProviders)
    .values({
      code: body.code,
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
      kind: body.kind,
      isEnabled: body.isEnabled ?? false,
      displayOrder: body.displayOrder ?? 0,
      config: body.config ?? {},
    })
    .returning({ id: paymentProviders.id });

  if (!row) throw new Error("Failed to insert payment provider");
  return row;
}

export async function updatePaymentProvider(
  id: string,
  body: UpdatePaymentProviderBody,
): Promise<PaymentProviderDetail | null> {
  const [current] = await db
    .select()
    .from(paymentProviders)
    .where(eq(paymentProviders.id, id))
    .limit(1);
  if (!current) return null;

  const nextKind = body.kind ?? current.kind;
  const nextEnabled = body.isEnabled ?? current.isEnabled;

  assertCanEnable({
    code: current.code,
    kind: nextKind,
    isEnabled: nextEnabled,
  });

  const patch: Partial<typeof paymentProviders.$inferInsert> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.description !== undefined) {
    patch.description = body.description === null ? null : body.description.trim();
  }
  if (body.kind !== undefined) patch.kind = body.kind;
  if (body.isEnabled !== undefined) patch.isEnabled = body.isEnabled;
  if (body.displayOrder !== undefined) patch.displayOrder = body.displayOrder;
  if (body.config !== undefined) patch.config = body.config;

  if (Object.keys(patch).length === 0) {
    return toDetail(current);
  }

  await db.update(paymentProviders).set(patch).where(eq(paymentProviders.id, id));

  return getPaymentProvider(id);
}

export async function deletePaymentProvider(id: string): Promise<boolean> {
  const rows = await db
    .delete(paymentProviders)
    .where(eq(paymentProviders.id, id))
    .returning({ id: paymentProviders.id });
  return rows.length > 0;
}
