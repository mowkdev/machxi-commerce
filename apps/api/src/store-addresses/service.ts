// Customer-scoped address operations for the storefront.
//
// We deliberately delegate to the admin customer service (see
// `apps/api/src/customers/service.ts`) for create/update/delete: the row
// shape, default-flag transition logic, and PG check constraints are
// identical — what differs is the authorization scope, and that lives in the
// route layer (the customerId is always the authenticated principal's, never
// path-supplied).

import { db } from "@repo/database/client";
import { and, asc, desc, eq } from "@repo/database";
import { addresses } from "@repo/database/schema";
import {
  createCustomerAddress,
  deleteCustomerAddress,
  updateCustomerAddress,
} from "../customers/service";
import type { Address, CreateAddressBody, UpdateAddressBody } from "./schema";

export async function listMyAddresses(customerId: string): Promise<Address[]> {
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.customerId, customerId))
    .orderBy(
      desc(addresses.isDefaultShipping),
      desc(addresses.isDefaultBilling),
      asc(addresses.createdAt),
    );
  return rows as Address[];
}

export async function getMyAddress(
  customerId: string,
  addressId: string,
): Promise<Address | null> {
  const [row] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.customerId, customerId), eq(addresses.id, addressId)))
    .limit(1);
  return (row as Address | undefined) ?? null;
}

export function createMyAddress(
  customerId: string,
  body: CreateAddressBody,
): Promise<Address | null> {
  return createCustomerAddress(customerId, body) as Promise<Address | null>;
}

export function updateMyAddress(
  customerId: string,
  addressId: string,
  body: UpdateAddressBody,
): Promise<Address | null> {
  return updateCustomerAddress(customerId, addressId, body) as Promise<
    Address | null
  >;
}

export function deleteMyAddress(
  customerId: string,
  addressId: string,
): Promise<boolean> {
  return deleteCustomerAddress(customerId, addressId);
}
