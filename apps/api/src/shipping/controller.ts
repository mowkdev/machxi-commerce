import type { Context } from "hono";
import type { AppEnv } from "../context";
import { conflict, notFound, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { parseBody } from "../lib/validate";
import {
  createShippingOptionBody,
  createShippingZoneBody,
  listShippingOptionsQuery,
  listShippingZonesQuery,
  shippingOptionIdParam,
  shippingZoneIdParam,
  updateShippingOptionBody,
  updateShippingZoneBody,
} from "./schema";
import {
  createShippingOption,
  createShippingZone,
  deleteShippingOption,
  deleteShippingZone,
  getShippingOption,
  getShippingZone,
  listShippingOptions,
  listShippingZones,
  updateShippingOption,
  updateShippingZone,
} from "./service";

const PG_UNIQUE_VIOLATION = "23505";
const PG_CHECK_VIOLATION = "23514";
const PG_FOREIGN_KEY_VIOLATION = "23503";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  prices_currency_code_check:
    "Currency code must be a three-letter uppercase code.",
  prices_amount_check: "Shipping price amount must be zero or greater.",
  prices_compare_at_check: "Compare-at amount must be greater than the amount.",
  prices_min_quantity_check: "Minimum quantity must be at least one.",
  uk_prices_set_currency_qty:
    "A shipping price already exists for this currency and minimum quantity.",
  shipping_zone_countries_country_code_check:
    "Country code must be a two-letter uppercase code.",
};

function translatePgError(err: unknown): never {
  const pgErr =
    (err as { cause?: { code?: string; constraint?: string } }).cause ?? err;
  if (typeof pgErr === "object" && pgErr !== null) {
    const code = (pgErr as { code?: string }).code;
    const constraint = (pgErr as { constraint?: string }).constraint;
    const message = constraint
      ? (CONSTRAINT_MESSAGES[constraint] ??
        "Shipping configuration conflicts with existing data.")
      : "Shipping configuration conflicts with existing data.";

    if (code === PG_UNIQUE_VIOLATION || code === PG_CHECK_VIOLATION) {
      throw conflict(message);
    }
    if (code === PG_FOREIGN_KEY_VIOLATION) {
      throw conflict(
        "Shipping configuration references a missing or protected record.",
      );
    }
  }

  throw err;
}

export async function listShippingZonesController(c: Context<AppEnv>) {
  const parsed = listShippingZonesQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries()),
  );
  if (!parsed.success) {
    throw validationFailed("Invalid query parameters", {
      issues: parsed.error.issues,
    });
  }

  const result = await listShippingZones(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getShippingZoneController(c: Context<AppEnv>) {
  const params = shippingZoneIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid shipping zone ID", {
      issues: params.error.issues,
    });
  }

  const zone = await getShippingZone(params.data.id);
  if (!zone) throw notFound("Shipping zone not found");

  return ok(c, zone);
}

export async function createShippingZoneController(c: Context<AppEnv>) {
  const body = await parseBody(c, createShippingZoneBody);
  try {
    const result = await createShippingZone(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateShippingZoneController(c: Context<AppEnv>) {
  const params = shippingZoneIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid shipping zone ID", {
      issues: params.error.issues,
    });
  }

  const body = await parseBody(c, updateShippingZoneBody);
  try {
    const updated = await updateShippingZone(params.data.id, body);
    if (!updated) throw notFound("Shipping zone not found");
    return ok(c, updated);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deleteShippingZoneController(c: Context<AppEnv>) {
  const params = shippingZoneIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid shipping zone ID", {
      issues: params.error.issues,
    });
  }

  try {
    const deleted = await deleteShippingZone(params.data.id);
    if (!deleted) throw notFound("Shipping zone not found");
    return ok(c, { id: params.data.id, deleted: true });
  } catch (err) {
    translatePgError(err);
  }
}

export async function listShippingOptionsController(c: Context<AppEnv>) {
  const parsed = listShippingOptionsQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries()),
  );
  if (!parsed.success) {
    throw validationFailed("Invalid query parameters", {
      issues: parsed.error.issues,
    });
  }

  const result = await listShippingOptions(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getShippingOptionController(c: Context<AppEnv>) {
  const params = shippingOptionIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid shipping option ID", {
      issues: params.error.issues,
    });
  }

  const option = await getShippingOption(params.data.id);
  if (!option) throw notFound("Shipping option not found");

  return ok(c, option);
}

export async function createShippingOptionController(c: Context<AppEnv>) {
  const body = await parseBody(c, createShippingOptionBody);
  try {
    const result = await createShippingOption(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateShippingOptionController(c: Context<AppEnv>) {
  const params = shippingOptionIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid shipping option ID", {
      issues: params.error.issues,
    });
  }

  const body = await parseBody(c, updateShippingOptionBody);
  try {
    const updated = await updateShippingOption(params.data.id, body);
    if (!updated) throw notFound("Shipping option not found");
    return ok(c, updated);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deleteShippingOptionController(c: Context<AppEnv>) {
  const params = shippingOptionIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid shipping option ID", {
      issues: params.error.issues,
    });
  }

  try {
    const deleted = await deleteShippingOption(params.data.id);
    if (!deleted) throw notFound("Shipping option not found");
    return ok(c, { id: params.data.id, deleted: true });
  } catch (err) {
    translatePgError(err);
  }
}
