import { describe, expect, it } from "vitest";
import { registerCustomer } from "../../store-auth/service";
import {
  createMyAddress,
  deleteMyAddress,
  getMyAddress,
  listMyAddresses,
  updateMyAddress,
} from "../service";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function newCustomer(prefix: string) {
  const session = await registerCustomer({
    email: uniqueEmail(prefix),
    password: "correct horse battery staple",
    firstName: "Addr",
    lastName: "Owner",
    phone: null,
  });
  return session.customer.id;
}

const baseAddress = {
  firstName: "Ada",
  lastName: "Lovelace",
  company: null,
  phone: null,
  isDefaultShipping: false,
  isDefaultBilling: false,
  addressLine1: "1 Babbage Ln",
  addressLine2: null,
  city: "London",
  provinceCode: null,
  postalCode: "EC1A 1BB",
  countryCode: "GB",
};

describe("store-addresses service", () => {
  it("creates and lists addresses scoped to a customer", async () => {
    const customerId = await newCustomer("addr-list");
    const created = await createMyAddress(customerId, baseAddress);
    expect(created).not.toBeNull();
    expect(created!.customerId).toBe(customerId);
    expect(created!.countryCode).toBe("GB");

    const list = await listMyAddresses(customerId);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created!.id);
  });

  it("does not leak addresses across customers", async () => {
    const a = await newCustomer("addr-a");
    const b = await newCustomer("addr-b");
    const created = await createMyAddress(a, baseAddress);
    expect(created).not.toBeNull();

    const fromB = await getMyAddress(b, created!.id);
    expect(fromB).toBeNull();
    expect(await listMyAddresses(b)).toHaveLength(0);
  });

  it("transitions the default-shipping flag atomically", async () => {
    const customerId = await newCustomer("addr-default");
    const first = await createMyAddress(customerId, {
      ...baseAddress,
      isDefaultShipping: true,
    });
    const second = await createMyAddress(customerId, baseAddress);
    expect(first!.isDefaultShipping).toBe(true);

    await updateMyAddress(customerId, second!.id, { isDefaultShipping: true });

    const list = await listMyAddresses(customerId);
    const firstAfter = list.find((a) => a.id === first!.id)!;
    const secondAfter = list.find((a) => a.id === second!.id)!;
    expect(firstAfter.isDefaultShipping).toBe(false);
    expect(secondAfter.isDefaultShipping).toBe(true);
  });

  it("rejects updates and deletes targeting another customer's address", async () => {
    const a = await newCustomer("addr-cross-a");
    const b = await newCustomer("addr-cross-b");
    const created = await createMyAddress(a, baseAddress);

    const tampered = await updateMyAddress(b, created!.id, {
      city: "Hijacked",
    });
    expect(tampered).toBeNull();

    const deleted = await deleteMyAddress(b, created!.id);
    expect(deleted).toBe(false);
  });

  it("deletes its own address", async () => {
    const customerId = await newCustomer("addr-del");
    const created = await createMyAddress(customerId, baseAddress);
    const deleted = await deleteMyAddress(customerId, created!.id);
    expect(deleted).toBe(true);
    expect(await listMyAddresses(customerId)).toHaveLength(0);
  });
});
