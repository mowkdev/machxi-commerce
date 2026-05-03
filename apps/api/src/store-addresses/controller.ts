import type { Context } from "hono";
import type { AppEnv } from "../context";
import { notFound, unauthorized, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { parseBody } from "../lib/validate";
import {
  createMyAddress,
  deleteMyAddress,
  getMyAddress,
  listMyAddresses,
  updateMyAddress,
} from "./service";
import { addressIdParam, createAddressBody, updateAddressBody } from "./schema";

function requireCustomerId(c: Context<AppEnv>): string {
  const principal = c.get("principal");
  if (!principal || principal.kind !== "customer") throw unauthorized();
  return principal.customerId;
}

function parseId(c: Context<AppEnv>): string {
  const parsed = addressIdParam.safeParse({ id: c.req.param("id") });
  if (!parsed.success) {
    throw validationFailed("Invalid address ID", {
      issues: parsed.error.issues,
    });
  }
  return parsed.data.id;
}

export async function listAddressesController(c: Context<AppEnv>) {
  const customerId = requireCustomerId(c);
  const data = await listMyAddresses(customerId);
  return ok(c, data);
}

export async function getAddressController(c: Context<AppEnv>) {
  const customerId = requireCustomerId(c);
  const id = parseId(c);
  const address = await getMyAddress(customerId, id);
  if (!address) throw notFound("Address not found");
  return ok(c, address);
}

export async function createAddressController(c: Context<AppEnv>) {
  const customerId = requireCustomerId(c);
  const body = await parseBody(c, createAddressBody);
  const address = await createMyAddress(customerId, body);
  if (!address) throw notFound("Customer not found");
  return ok(c, address, undefined, 201);
}

export async function updateAddressController(c: Context<AppEnv>) {
  const customerId = requireCustomerId(c);
  const id = parseId(c);
  const body = await parseBody(c, updateAddressBody);
  const address = await updateMyAddress(customerId, id, body);
  if (!address) throw notFound("Address not found");
  return ok(c, address);
}

export async function deleteAddressController(c: Context<AppEnv>) {
  const customerId = requireCustomerId(c);
  const id = parseId(c);
  const deleted = await deleteMyAddress(customerId, id);
  if (!deleted) throw notFound("Address not found");
  return ok(c, { id, deleted: true as const });
}
