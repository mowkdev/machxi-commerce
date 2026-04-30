import type { Context } from "hono";
import type { AppEnv } from "../context";
import { notFound, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { parseBody } from "../lib/validate";
import {
  createFulfillmentBody,
  createFulfillmentItemBody,
  fulfillmentIdParam,
  fulfillmentItemParam,
  listFulfillmentsQuery,
  updateFulfillmentBody,
  updateFulfillmentItemBody,
} from "./schema";
import {
  createFulfillment,
  createFulfillmentItem,
  deleteFulfillment,
  deleteFulfillmentItem,
  getFulfillment,
  listFulfillments,
  updateFulfillment,
  updateFulfillmentItem,
} from "./service";

const PG_CONSTRAINT_ERROR_CODES = new Set(["23503", "23505", "23514"]);

function translateError(err: unknown): never {
  const pgErr = (err as { cause?: { code?: string } }).cause ?? err;
  const code =
    typeof pgErr === "object" && pgErr !== null
      ? (pgErr as { code?: string }).code
      : undefined;
  if (code && PG_CONSTRAINT_ERROR_CODES.has(code)) {
    throw validationFailed("Fulfillment data violates database constraints.");
  }
  if (err instanceof Error && err.message.includes("quantity exceeds")) {
    throw validationFailed(err.message);
  }
  throw err;
}

function parseId(c: Context<AppEnv>) {
  const params = fulfillmentIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid fulfillment ID", {
      issues: params.error.issues,
    });
  }
  return params.data.id;
}

export async function listFulfillmentsController(c: Context<AppEnv>) {
  const parsed = listFulfillmentsQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries()),
  );
  if (!parsed.success) {
    throw validationFailed("Invalid query parameters", {
      issues: parsed.error.issues,
    });
  }
  const result = await listFulfillments(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getFulfillmentController(c: Context<AppEnv>) {
  const fulfillment = await getFulfillment(parseId(c));
  if (!fulfillment) throw notFound("Fulfillment not found");
  return ok(c, fulfillment);
}

export async function createFulfillmentController(c: Context<AppEnv>) {
  const body = await parseBody(c, createFulfillmentBody);
  try {
    const result = await createFulfillment(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translateError(err);
  }
}

export async function updateFulfillmentController(c: Context<AppEnv>) {
  const id = parseId(c);
  const body = await parseBody(c, updateFulfillmentBody);
  try {
    const fulfillment = await updateFulfillment(id, body);
    if (!fulfillment) throw notFound("Fulfillment not found");
    return ok(c, fulfillment);
  } catch (err) {
    translateError(err);
  }
}

export async function deleteFulfillmentController(c: Context<AppEnv>) {
  const id = parseId(c);
  const deleted = await deleteFulfillment(id);
  if (!deleted) throw notFound("Fulfillment not found");
  return ok(c, { id, deleted: true });
}

export async function createFulfillmentItemController(c: Context<AppEnv>) {
  const params = fulfillmentIdParam.safeParse({ id: c.req.param("fulfillmentId") });
  if (!params.success) {
    throw validationFailed("Invalid fulfillment ID", {
      issues: params.error.issues,
    });
  }
  const body = await parseBody(c, createFulfillmentItemBody);
  try {
    const item = await createFulfillmentItem(params.data.id, body);
    if (!item) throw notFound("Fulfillment or order item not found");
    return ok(c, item, undefined, 201);
  } catch (err) {
    translateError(err);
  }
}

export async function updateFulfillmentItemController(c: Context<AppEnv>) {
  const params = fulfillmentItemParam.safeParse({
    fulfillmentId: c.req.param("fulfillmentId"),
    orderItemId: c.req.param("orderItemId"),
  });
  if (!params.success) {
    throw validationFailed("Invalid fulfillment item parameters", {
      issues: params.error.issues,
    });
  }
  const body = await parseBody(c, updateFulfillmentItemBody);
  try {
    const item = await updateFulfillmentItem(
      params.data.fulfillmentId,
      params.data.orderItemId,
      body,
    );
    if (!item) throw notFound("Fulfillment item not found");
    return ok(c, item);
  } catch (err) {
    translateError(err);
  }
}

export async function deleteFulfillmentItemController(c: Context<AppEnv>) {
  const params = fulfillmentItemParam.safeParse({
    fulfillmentId: c.req.param("fulfillmentId"),
    orderItemId: c.req.param("orderItemId"),
  });
  if (!params.success) {
    throw validationFailed("Invalid fulfillment item parameters", {
      issues: params.error.issues,
    });
  }
  const deleted = await deleteFulfillmentItem(
    params.data.fulfillmentId,
    params.data.orderItemId,
  );
  if (!deleted) throw notFound("Fulfillment item not found");
  return ok(c, { id: params.data.orderItemId, deleted: true });
}
