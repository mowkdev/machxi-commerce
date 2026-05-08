import type { Context } from "hono";
import type { AppEnv } from "../context";
import { conflict, notFound, unauthorized } from "../lib/errors";
import { ok } from "../lib/response";
import { parseBody } from "../lib/validate";
import {
  changePasswordBody,
  loginBody,
  registerCustomerBody,
  registerFromOrderBody,
  updateProfileBody,
} from "./schema";
import {
  authenticateCustomer,
  changeCustomerPassword,
  getCustomerProfile,
  registerCustomer,
  registerFromOrder,
  updateCustomerProfile,
} from "./service";

const PG_UNIQUE_VIOLATION = "23505";
const PG_CHECK_VIOLATION = "23514";

function translatePgError(err: unknown): never {
  const pgErr =
    (err as { cause?: { code?: string; constraint?: string } }).cause ?? err;
  if (typeof pgErr === "object" && pgErr !== null) {
    const code = (pgErr as { code?: string }).code;
    if (code === PG_UNIQUE_VIOLATION) {
      throw conflict("An account with this email already exists.");
    }
    if (code === PG_CHECK_VIOLATION) {
      throw conflict("Account data violates database constraints.");
    }
  }
  throw err;
}

export async function registerCustomerController(c: Context<AppEnv>) {
  const body = await parseBody(c, registerCustomerBody);
  try {
    const session = await registerCustomer(body);
    return ok(c, session, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function registerFromOrderController(c: Context<AppEnv>) {
  const body = await parseBody(c, registerFromOrderBody);
  try {
    const session = await registerFromOrder(body);
    return ok(c, session, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function loginCustomerController(c: Context<AppEnv>) {
  const body = await parseBody(c, loginBody);
  const session = await authenticateCustomer(body);
  // Use the same response for missing account vs wrong password to avoid
  // leaking which emails are registered.
  if (!session) throw unauthorized("Invalid email or password");
  return ok(c, session);
}

export async function meController(c: Context<AppEnv>) {
  const principal = c.get("principal");
  if (!principal || principal.kind !== "customer") {
    throw unauthorized();
  }

  const profile = await getCustomerProfile(principal.customerId);
  if (!profile) {
    // Token was valid but the customer row has been removed since issuance.
    throw notFound("Customer not found");
  }

  return ok(c, profile);
}

export async function updateProfileController(c: Context<AppEnv>) {
  const principal = c.get("principal");
  if (!principal || principal.kind !== "customer") throw unauthorized();
  const body = await parseBody(c, updateProfileBody);
  try {
    const profile = await updateCustomerProfile(principal.customerId, body);
    if (!profile) throw notFound("Customer not found");
    return ok(c, profile);
  } catch (err) {
    translatePgError(err);
  }
}

export async function changePasswordController(c: Context<AppEnv>) {
  const principal = c.get("principal");
  if (!principal || principal.kind !== "customer") throw unauthorized();
  const body = await parseBody(c, changePasswordBody);
  const outcome = await changeCustomerPassword(principal.customerId, body);
  if (!outcome.ok && outcome.reason === "not_found") {
    throw notFound("Customer not found");
  }
  if (!outcome.ok && outcome.reason === "wrong_password") {
    throw unauthorized("Current password is incorrect");
  }
  return ok(c, { changed: true });
}
