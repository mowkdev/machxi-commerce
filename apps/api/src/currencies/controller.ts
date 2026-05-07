import type { Context } from "hono";
import type { AppEnv } from "../context";
import { conflict, notFound, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { parseBody } from "../lib/validate";
import {
  createCurrencyBody,
  currencyCodeParam,
  listCurrenciesQuery,
  updateCurrencyBody,
} from "./schema";
import {
  createCurrency,
  getCurrency,
  listCurrencies,
  updateCurrency,
} from "./service";

const PG_UNIQUE_VIOLATION = "23505";

function translatePgError(err: unknown): never {
  const pgErr =
    (err as { cause?: { code?: string; constraint?: string } }).cause ?? err;
  if (typeof pgErr === "object" && pgErr !== null) {
    const code = (pgErr as { code?: string }).code;
    if (code === PG_UNIQUE_VIOLATION) {
      throw conflict("A currency with this code already exists.");
    }
  }
  throw err;
}

export async function listCurrenciesController(c: Context<AppEnv>) {
  const parsed = listCurrenciesQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries()),
  );
  if (!parsed.success) {
    throw validationFailed("Invalid query parameters", {
      issues: parsed.error.issues,
    });
  }

  const result = await listCurrencies(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function createCurrencyController(c: Context<AppEnv>) {
  const body = await parseBody(c, createCurrencyBody);
  try {
    const result = await createCurrency(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function getCurrencyController(c: Context<AppEnv>) {
  const params = currencyCodeParam.safeParse({ code: c.req.param("code") });
  if (!params.success) {
    throw validationFailed("Invalid currency code", { issues: params.error.issues });
  }
  const row = await getCurrency(params.data.code);
  if (!row) throw notFound("Currency not found");
  return ok(c, row);
}

export async function updateCurrencyController(c: Context<AppEnv>) {
  const params = currencyCodeParam.safeParse({ code: c.req.param("code") });
  if (!params.success) {
    throw validationFailed("Invalid currency code", { issues: params.error.issues });
  }
  const body = updateCurrencyBody.safeParse(await c.req.json());
  if (!body.success) {
    throw validationFailed("Invalid body", { issues: body.error.issues });
  }
  const row = await updateCurrency(params.data.code, body.data);
  return ok(c, row);
}
