import type { Context } from "hono";
import type { AppEnv } from "../context";
import { conflict, notFound, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { parseBody } from "../lib/validate";
import {
  createCustomerAddressBody,
  createCustomerBody,
  customerAddressParam,
  customerIdParam,
  listCustomersQuery,
  updateCustomerAddressBody,
  updateCustomerBody,
} from "./schema";
import {
  createCustomer,
  createCustomerAddress,
  deleteCustomer,
  deleteCustomerAddress,
  getCustomer,
  listCustomers,
  updateCustomer,
  updateCustomerAddress,
} from "./service";

const PG_UNIQUE_VIOLATION = "23505";
const PG_CHECK_VIOLATION = "23514";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  customers_email_unique: "A customer with this email already exists.",
  customers_email_key: "A customer with this email already exists.",
  uk_addresses_default_shipping:
    "This customer already has a default shipping address.",
  uk_addresses_default_billing:
    "This customer already has a default billing address.",
};

const CHECK_MESSAGES: Record<string, string> = {
  customers_phone_check: "Customer phone must be in E.164 format.",
  addresses_phone_check: "Address phone must be in E.164 format.",
  addresses_country_code_check:
    "Address country code must be an uppercase ISO-2 code.",
};

function translatePgError(err: unknown): never {
  const pgErr =
    (err as { cause?: { code?: string; constraint?: string } }).cause ?? err;
  if (typeof pgErr === "object" && pgErr !== null) {
    const code = (pgErr as { code?: string }).code;
    const constraint = (pgErr as { constraint?: string }).constraint;
    if (code === PG_UNIQUE_VIOLATION) {
      const message =
        (constraint && CONSTRAINT_MESSAGES[constraint]) ??
        "This customer conflicts with an existing record.";
      throw conflict(message);
    }
    if (code === PG_CHECK_VIOLATION) {
      const message =
        (constraint && CHECK_MESSAGES[constraint]) ??
        "Customer data violates database constraints.";
      throw validationFailed(message);
    }
  }
  throw err;
}

export async function listCustomersController(c: Context<AppEnv>) {
  const parsed = listCustomersQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries()),
  );
  if (!parsed.success) {
    throw validationFailed("Invalid query parameters", {
      issues: parsed.error.issues,
    });
  }

  const result = await listCustomers(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getCustomerController(c: Context<AppEnv>) {
  const params = customerIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid customer ID", {
      issues: params.error.issues,
    });
  }

  const customer = await getCustomer(params.data.id);
  if (!customer) throw notFound("Customer not found");

  return ok(c, customer);
}

export async function createCustomerController(c: Context<AppEnv>) {
  const body = await parseBody(c, createCustomerBody);
  try {
    const result = await createCustomer(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateCustomerController(c: Context<AppEnv>) {
  const params = customerIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid customer ID", {
      issues: params.error.issues,
    });
  }

  const body = await parseBody(c, updateCustomerBody);
  try {
    const updated = await updateCustomer(params.data.id, body);
    if (!updated) throw notFound("Customer not found");
    return ok(c, updated);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deleteCustomerController(c: Context<AppEnv>) {
  const params = customerIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid customer ID", {
      issues: params.error.issues,
    });
  }

  const deleted = await deleteCustomer(params.data.id);
  if (!deleted) throw notFound("Customer not found");

  return ok(c, { id: params.data.id, deleted: true });
}

export async function createCustomerAddressController(c: Context<AppEnv>) {
  const params = customerIdParam.safeParse({ id: c.req.param("customerId") });
  if (!params.success) {
    throw validationFailed("Invalid customer ID", {
      issues: params.error.issues,
    });
  }

  const body = await parseBody(c, createCustomerAddressBody);
  try {
    const address = await createCustomerAddress(params.data.id, body);
    if (!address) throw notFound("Customer not found");
    return ok(c, address, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateCustomerAddressController(c: Context<AppEnv>) {
  const params = customerAddressParam.safeParse({
    customerId: c.req.param("customerId"),
    addressId: c.req.param("addressId"),
  });
  if (!params.success) {
    throw validationFailed("Invalid customer address parameters", {
      issues: params.error.issues,
    });
  }

  const body = await parseBody(c, updateCustomerAddressBody);
  try {
    const address = await updateCustomerAddress(
      params.data.customerId,
      params.data.addressId,
      body,
    );
    if (!address) throw notFound("Customer address not found");
    return ok(c, address);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deleteCustomerAddressController(c: Context<AppEnv>) {
  const params = customerAddressParam.safeParse({
    customerId: c.req.param("customerId"),
    addressId: c.req.param("addressId"),
  });
  if (!params.success) {
    throw validationFailed("Invalid customer address parameters", {
      issues: params.error.issues,
    });
  }

  const deleted = await deleteCustomerAddress(
    params.data.customerId,
    params.data.addressId,
  );
  if (!deleted) throw notFound("Customer address not found");

  return ok(c, { id: params.data.addressId, deleted: true });
}
