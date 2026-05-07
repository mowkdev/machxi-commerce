import type { Context } from "hono";
import type { AppEnv } from "../context";
import { notFound, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import {
  createPaymentProviderBody,
  listPaymentProvidersQuery,
  paymentProviderIdParam,
} from "./schema";
import { updatePaymentProviderBody } from "@repo/types/admin";
import {
  createPaymentProvider,
  deletePaymentProvider,
  getPaymentProvider,
  listPaymentProviders,
  updatePaymentProvider,
} from "./service";

export async function listPaymentProvidersController(c: Context<AppEnv>) {
  const parsed = listPaymentProvidersQuery.safeParse({
    page: c.req.query("page"),
    pageSize: c.req.query("pageSize"),
    search: c.req.query("search"),
    sortBy: c.req.query("sortBy"),
    sortOrder: c.req.query("sortOrder"),
  });
  if (!parsed.success) {
    throw validationFailed("Invalid query", { issues: parsed.error.issues });
  }
  const result = await listPaymentProviders(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getPaymentProviderController(c: Context<AppEnv>) {
  const params = paymentProviderIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid id", { issues: params.error.issues });
  }
  const row = await getPaymentProvider(params.data.id);
  if (!row) throw notFound("Payment provider not found");
  return ok(c, row);
}

export async function createPaymentProviderController(c: Context<AppEnv>) {
  let bodyJson: unknown;
  try {
    bodyJson = await c.req.json();
  } catch {
    throw validationFailed("Invalid JSON body");
  }
  const parsed = createPaymentProviderBody.safeParse(bodyJson);
  if (!parsed.success) {
    throw validationFailed("Invalid body", { issues: parsed.error.issues });
  }
  try {
    const created = await createPaymentProvider(parsed.data);
    return ok(c, created, undefined, 201);
  } catch (e) {
    if (
      e instanceof Error &&
      (e as Error & { statusCode?: number }).statusCode === 422
    ) {
      throw validationFailed(e.message);
    }
    throw e;
  }
}

export async function updatePaymentProviderController(c: Context<AppEnv>) {
  const params = paymentProviderIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid id", { issues: params.error.issues });
  }
  let bodyJson: unknown;
  try {
    bodyJson = await c.req.json();
  } catch {
    throw validationFailed("Invalid JSON body");
  }
  const parsed = updatePaymentProviderBody.safeParse(bodyJson);
  if (!parsed.success) {
    throw validationFailed("Invalid body", { issues: parsed.error.issues });
  }
  try {
    const row = await updatePaymentProvider(params.data.id, parsed.data);
    if (!row) throw notFound("Payment provider not found");
    return ok(c, row);
  } catch (e) {
    if (
      e instanceof Error &&
      (e as Error & { statusCode?: number }).statusCode === 422
    ) {
      throw validationFailed(e.message);
    }
    throw e;
  }
}

export async function deletePaymentProviderController(c: Context<AppEnv>) {
  const params = paymentProviderIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid id", { issues: params.error.issues });
  }
  const deleted = await deletePaymentProvider(params.data.id);
  if (!deleted) throw notFound("Payment provider not found");
  return ok(c, { id: params.data.id, deleted: true as const });
}
