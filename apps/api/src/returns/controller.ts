import type { Context } from "hono";
import type { AppEnv } from "../context";
import { notFound, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { parseBody } from "../lib/validate";
import {
  createReturnBody,
  createReturnItemBody,
  listReturnsQuery,
  returnIdParam,
  returnItemParam,
  updateReturnBody,
  updateReturnItemBody,
} from "./schema";
import {
  createReturn,
  createReturnItem,
  deleteReturn,
  deleteReturnItem,
  getReturn,
  listReturns,
  updateReturn,
  updateReturnItem,
} from "./service";

const PG_CONSTRAINT_ERROR_CODES = new Set(["23503", "23505", "23514"]);

function translateError(err: unknown): never {
  const pgErr = (err as { cause?: { code?: string } }).cause ?? err;
  const code =
    typeof pgErr === "object" && pgErr !== null
      ? (pgErr as { code?: string }).code
      : undefined;
  if (code && PG_CONSTRAINT_ERROR_CODES.has(code)) {
    throw validationFailed("Return data violates database constraints.");
  }
  if (err instanceof Error && err.message.includes("quantity exceeds")) {
    throw validationFailed(err.message);
  }
  throw err;
}

function parseId(c: Context<AppEnv>) {
  const params = returnIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid return ID", { issues: params.error.issues });
  }
  return params.data.id;
}

export async function listReturnsController(c: Context<AppEnv>) {
  const parsed = listReturnsQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries()),
  );
  if (!parsed.success) {
    throw validationFailed("Invalid query parameters", {
      issues: parsed.error.issues,
    });
  }
  const result = await listReturns(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getReturnController(c: Context<AppEnv>) {
  const orderReturn = await getReturn(parseId(c));
  if (!orderReturn) throw notFound("Return not found");
  return ok(c, orderReturn);
}

export async function createReturnController(c: Context<AppEnv>) {
  const body = await parseBody(c, createReturnBody);
  try {
    const result = await createReturn(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translateError(err);
  }
}

export async function updateReturnController(c: Context<AppEnv>) {
  const id = parseId(c);
  const body = await parseBody(c, updateReturnBody);
  try {
    const orderReturn = await updateReturn(id, body);
    if (!orderReturn) throw notFound("Return not found");
    return ok(c, orderReturn);
  } catch (err) {
    translateError(err);
  }
}

export async function deleteReturnController(c: Context<AppEnv>) {
  const id = parseId(c);
  const deleted = await deleteReturn(id);
  if (!deleted) throw notFound("Return not found");
  return ok(c, { id, deleted: true });
}

export async function createReturnItemController(c: Context<AppEnv>) {
  const params = returnIdParam.safeParse({ id: c.req.param("returnId") });
  if (!params.success) {
    throw validationFailed("Invalid return ID", { issues: params.error.issues });
  }
  const body = await parseBody(c, createReturnItemBody);
  try {
    const item = await createReturnItem(params.data.id, body);
    if (!item) throw notFound("Return or order item not found");
    return ok(c, item, undefined, 201);
  } catch (err) {
    translateError(err);
  }
}

export async function updateReturnItemController(c: Context<AppEnv>) {
  const params = returnItemParam.safeParse({
    returnId: c.req.param("returnId"),
    itemId: c.req.param("itemId"),
  });
  if (!params.success) {
    throw validationFailed("Invalid return item parameters", {
      issues: params.error.issues,
    });
  }
  const body = await parseBody(c, updateReturnItemBody);
  try {
    const item = await updateReturnItem(
      params.data.returnId,
      params.data.itemId,
      body,
    );
    if (!item) throw notFound("Return item not found");
    return ok(c, item);
  } catch (err) {
    translateError(err);
  }
}

export async function deleteReturnItemController(c: Context<AppEnv>) {
  const params = returnItemParam.safeParse({
    returnId: c.req.param("returnId"),
    itemId: c.req.param("itemId"),
  });
  if (!params.success) {
    throw validationFailed("Invalid return item parameters", {
      issues: params.error.issues,
    });
  }
  const deleted = await deleteReturnItem(params.data.returnId, params.data.itemId);
  if (!deleted) throw notFound("Return item not found");
  return ok(c, { id: params.data.itemId, deleted: true });
}
