import bcrypt from "bcryptjs";
import { db } from "@repo/database/client";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  sql,
} from "@repo/database";
import { addresses, customers, orders } from "@repo/database/schema";
import type { PaginationMeta } from "@repo/types";
import type {
  CreateCustomerAddressBody,
  CreateCustomerBody,
  CustomerAddress,
  CustomerDetail,
  CustomerListItem,
  UpdateCustomerAddressBody,
  UpdateCustomerBody,
} from "@repo/types/admin";
import type { ListCustomersQuery } from "./schema";

const PASSWORD_HASH_ROUNDS = 12;

const SORT_COLUMNS = {
  email: customers.email,
  firstName: customers.firstName,
  lastName: customers.lastName,
  createdAt: customers.createdAt,
  updatedAt: customers.updatedAt,
} as const;

type CustomerTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function normalizeNullableString(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizePhone(value: string | null | undefined): string | null {
  return normalizeNullableString(value);
}

function normalizeCustomerCreate(
  body: CreateCustomerBody,
  passwordHash: string,
) {
  return {
    email: body.email.trim().toLowerCase(),
    passwordHash,
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    phone: normalizePhone(body.phone),
    emailVerifiedAt: body.emailVerifiedAt ?? null,
  };
}

function normalizeCustomerUpdate(body: UpdateCustomerBody) {
  const updateFields: Partial<typeof customers.$inferInsert> = {};
  if (body.email !== undefined)
    updateFields.email = body.email.trim().toLowerCase();
  if (body.firstName !== undefined)
    updateFields.firstName = body.firstName.trim();
  if (body.lastName !== undefined) updateFields.lastName = body.lastName.trim();
  if (body.phone !== undefined) updateFields.phone = normalizePhone(body.phone);
  if (body.emailVerifiedAt !== undefined)
    updateFields.emailVerifiedAt = body.emailVerifiedAt;
  return updateFields;
}

function normalizeCustomerAddressCreate(
  customerId: string,
  body: CreateCustomerAddressBody,
) {
  return {
    customerId,
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    company: normalizeNullableString(body.company),
    phone: normalizePhone(body.phone),
    isDefaultShipping: body.isDefaultShipping,
    isDefaultBilling: body.isDefaultBilling,
    addressLine1: body.addressLine1.trim(),
    addressLine2: normalizeNullableString(body.addressLine2),
    city: body.city.trim(),
    provinceCode: normalizeNullableString(body.provinceCode),
    postalCode: body.postalCode.trim(),
    countryCode: body.countryCode.trim().toUpperCase(),
  };
}

function normalizeCustomerAddressUpdate(body: UpdateCustomerAddressBody) {
  const updateFields: Partial<typeof addresses.$inferInsert> = {};
  if (body.firstName !== undefined)
    updateFields.firstName = body.firstName.trim();
  if (body.lastName !== undefined) updateFields.lastName = body.lastName.trim();
  if (body.company !== undefined)
    updateFields.company = normalizeNullableString(body.company);
  if (body.phone !== undefined) updateFields.phone = normalizePhone(body.phone);
  if (body.isDefaultShipping !== undefined)
    updateFields.isDefaultShipping = body.isDefaultShipping;
  if (body.isDefaultBilling !== undefined)
    updateFields.isDefaultBilling = body.isDefaultBilling;
  if (body.addressLine1 !== undefined)
    updateFields.addressLine1 = body.addressLine1.trim();
  if (body.addressLine2 !== undefined) {
    updateFields.addressLine2 = normalizeNullableString(body.addressLine2);
  }
  if (body.city !== undefined) updateFields.city = body.city.trim();
  if (body.provinceCode !== undefined) {
    updateFields.provinceCode = normalizeNullableString(body.provinceCode);
  }
  if (body.postalCode !== undefined)
    updateFields.postalCode = body.postalCode.trim();
  if (body.countryCode !== undefined) {
    updateFields.countryCode = body.countryCode.trim().toUpperCase();
  }
  return updateFields;
}

async function customerExists(
  tx: CustomerTx,
  customerId: string,
): Promise<boolean> {
  const rows = await tx
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);
  return rows.length > 0;
}

async function clearExistingDefaults(
  tx: CustomerTx,
  customerId: string,
  body: Pick<
    UpdateCustomerAddressBody,
    "isDefaultShipping" | "isDefaultBilling"
  >,
  excludeAddressId?: string,
) {
  const scopedAddresses = excludeAddressId
    ? and(
        eq(addresses.customerId, customerId),
        ne(addresses.id, excludeAddressId),
      )
    : eq(addresses.customerId, customerId);

  if (body.isDefaultShipping === true) {
    await tx
      .update(addresses)
      .set({ isDefaultShipping: false })
      .where(and(scopedAddresses, eq(addresses.isDefaultShipping, true)));
  }

  if (body.isDefaultBilling === true) {
    await tx
      .update(addresses)
      .set({ isDefaultBilling: false })
      .where(and(scopedAddresses, eq(addresses.isDefaultBilling, true)));
  }
}

async function getAddressCountMap(
  customerIds: string[],
): Promise<Map<string, number>> {
  if (customerIds.length === 0) return new Map();

  const rows = await db
    .select({
      customerId: addresses.customerId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(addresses)
    .where(inArray(addresses.customerId, customerIds))
    .groupBy(addresses.customerId);

  return new Map(
    rows
      .filter((row): row is { customerId: string; count: number } =>
        Boolean(row.customerId),
      )
      .map((row) => [row.customerId, row.count]),
  );
}

async function getOrderCountMap(
  customerIds: string[],
): Promise<Map<string, number>> {
  if (customerIds.length === 0) return new Map();

  const rows = await db
    .select({
      customerId: orders.customerId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(orders)
    .where(inArray(orders.customerId, customerIds))
    .groupBy(orders.customerId);

  return new Map(
    rows
      .filter((row): row is { customerId: string; count: number } =>
        Boolean(row.customerId),
      )
      .map((row) => [row.customerId, row.count]),
  );
}

export async function listCustomers(
  query: ListCustomersQuery,
): Promise<{ data: CustomerListItem[]; meta: PaginationMeta }> {
  const searchFilter = query.search
    ? or(
        ilike(customers.email, `%${query.search}%`),
        ilike(customers.firstName, `%${query.search}%`),
        ilike(customers.lastName, `%${query.search}%`),
        ilike(customers.phone, `%${query.search}%`),
      )
    : undefined;
  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy =
    query.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: customers.id,
      email: customers.email,
      firstName: customers.firstName,
      lastName: customers.lastName,
      phone: customers.phone,
      emailVerifiedAt: customers.emailVerifiedAt,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(customers)
    .where(searchFilter)
    .orderBy(orderBy, asc(customers.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages =
    totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const customerIds = rows.map((row) => row.id);
  const [addressCountMap, orderCountMap] = await Promise.all([
    getAddressCountMap(customerIds),
    getOrderCountMap(customerIds),
  ]);
  const data: CustomerListItem[] = rows.map(
    ({ totalCount: _totalCount, ...row }) => ({
      ...row,
      addressCount: addressCountMap.get(row.id) ?? 0,
      orderCount: orderCountMap.get(row.id) ?? 0,
    }),
  );

  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      totalItems,
    },
  };
}

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const rows = await db
    .select({
      id: customers.id,
      email: customers.email,
      firstName: customers.firstName,
      lastName: customers.lastName,
      phone: customers.phone,
      emailVerifiedAt: customers.emailVerifiedAt,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
    })
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  const customer = rows[0];
  if (!customer) return null;

  const customerAddresses = await db
    .select()
    .from(addresses)
    .where(eq(addresses.customerId, id))
    .orderBy(
      desc(addresses.isDefaultShipping),
      desc(addresses.isDefaultBilling),
      asc(addresses.createdAt),
    );

  return {
    ...customer,
    addressCount: customerAddresses.length,
    orderCount: (await getOrderCountMap([id])).get(id) ?? 0,
    addresses: customerAddresses,
  };
}

export async function createCustomer(
  body: CreateCustomerBody,
): Promise<{ id: string }> {
  const passwordHash = await bcrypt.hash(body.password, PASSWORD_HASH_ROUNDS);
  const [row] = await db
    .insert(customers)
    .values(normalizeCustomerCreate(body, passwordHash))
    .returning({ id: customers.id });
  return { id: row.id };
}

export async function updateCustomer(
  id: string,
  body: UpdateCustomerBody,
): Promise<CustomerDetail | null> {
  const updateFields = normalizeCustomerUpdate(body);

  if (Object.keys(updateFields).length === 0) {
    return getCustomer(id);
  }

  const rows = await db
    .update(customers)
    .set(updateFields)
    .where(eq(customers.id, id))
    .returning({ id: customers.id });
  if (rows.length === 0) return null;
  return getCustomer(id);
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const rows = await db
    .delete(customers)
    .where(eq(customers.id, id))
    .returning({ id: customers.id });
  return rows.length > 0;
}

export async function createCustomerAddress(
  customerId: string,
  body: CreateCustomerAddressBody,
): Promise<CustomerAddress | null> {
  return db.transaction(async (tx) => {
    if (!(await customerExists(tx, customerId))) return null;

    const values = normalizeCustomerAddressCreate(customerId, body);
    const [created] = await tx
      .insert(addresses)
      .values({
        ...values,
        isDefaultShipping: false,
        isDefaultBilling: false,
      })
      .returning();
    await clearExistingDefaults(tx, customerId, body, created.id);

    if (body.isDefaultShipping || body.isDefaultBilling) {
      const [updated] = await tx
        .update(addresses)
        .set({
          isDefaultShipping: body.isDefaultShipping,
          isDefaultBilling: body.isDefaultBilling,
        })
        .where(eq(addresses.id, created.id))
        .returning();
      return updated ?? created;
    }

    return created;
  });
}

export async function updateCustomerAddress(
  customerId: string,
  addressId: string,
  body: UpdateCustomerAddressBody,
): Promise<CustomerAddress | null> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(
        and(eq(addresses.customerId, customerId), eq(addresses.id, addressId)),
      )
      .limit(1);
    if (!existing) return null;

    await clearExistingDefaults(tx, customerId, body, addressId);
    const updateFields = normalizeCustomerAddressUpdate(body);
    if (Object.keys(updateFields).length === 0) {
      const [address] = await tx
        .select()
        .from(addresses)
        .where(
          and(
            eq(addresses.customerId, customerId),
            eq(addresses.id, addressId),
          ),
        )
        .limit(1);
      return address ?? null;
    }

    const [row] = await tx
      .update(addresses)
      .set(updateFields)
      .where(
        and(eq(addresses.customerId, customerId), eq(addresses.id, addressId)),
      )
      .returning();
    return row ?? null;
  });
}

export async function deleteCustomerAddress(
  customerId: string,
  addressId: string,
): Promise<boolean> {
  const rows = await db
    .delete(addresses)
    .where(
      and(eq(addresses.customerId, customerId), eq(addresses.id, addressId)),
    )
    .returning({ id: addresses.id });
  return rows.length > 0;
}
