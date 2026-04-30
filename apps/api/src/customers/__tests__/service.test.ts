import { describe, expect, it } from "vitest";
import type { CreateCustomerAddressBody, CreateCustomerBody } from "../schema";
import {
  createCustomer,
  createCustomerAddress,
  deleteCustomer,
  deleteCustomerAddress,
  getCustomer,
  listCustomers,
  updateCustomer,
  updateCustomerAddress,
} from "../service";

function uniqueToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeCustomer(
  overrides: Partial<CreateCustomerBody> = {},
): CreateCustomerBody {
  const token = uniqueToken();
  return {
    email: `customer-${token}@example.com`,
    password: "correct horse battery staple",
    firstName: "Test",
    lastName: "Customer",
    phone: "+15551234567",
    emailVerifiedAt: null,
    ...overrides,
  };
}

function makeAddress(
  overrides: Partial<CreateCustomerAddressBody> = {},
): CreateCustomerAddressBody {
  return {
    firstName: "Test",
    lastName: "Customer",
    company: null,
    phone: null,
    isDefaultShipping: false,
    isDefaultBilling: false,
    addressLine1: "123 Test St",
    addressLine2: null,
    city: "Testville",
    provinceCode: null,
    postalCode: "12345",
    countryCode: "us",
    ...overrides,
  };
}

describe("customer service", () => {
  it("creates, lists, updates, and retrieves customers without password hashes", async () => {
    const created = await createCustomer(
      makeCustomer({ firstName: "Ada", lastName: "Lovelace" }),
    );

    const detail = await getCustomer(created.id);
    expect(detail).not.toBeNull();
    expect(detail!.firstName).toBe("Ada");
    expect(detail!.addressCount).toBe(0);
    expect(
      (detail as unknown as Record<string, unknown>).passwordHash,
    ).toBeUndefined();

    const listed = await listCustomers({
      page: 1,
      pageSize: 20,
      search: detail!.email,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    expect(listed.data.map((customer) => customer.id)).toContain(created.id);

    const updated = await updateCustomer(created.id, {
      firstName: "Grace",
      phone: null,
    });
    expect(updated).not.toBeNull();
    expect(updated!.firstName).toBe("Grace");
    expect(updated!.phone).toBeNull();

    await expect(deleteCustomer(created.id)).resolves.toBe(true);
  });

  it("manages addresses and keeps one default per customer", async () => {
    const customer = await createCustomer(makeCustomer());
    const first = await createCustomerAddress(
      customer.id,
      makeAddress({ isDefaultShipping: true, countryCode: "gb" }),
    );
    const second = await createCustomerAddress(
      customer.id,
      makeAddress({
        addressLine1: "456 Other St",
        isDefaultShipping: true,
        isDefaultBilling: true,
      }),
    );

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();

    let detail = await getCustomer(customer.id);
    expect(detail!.addressCount).toBe(2);
    expect(
      detail!.addresses.find((address) => address.id === first!.id)!
        .isDefaultShipping,
    ).toBe(false);
    expect(
      detail!.addresses.find((address) => address.id === second!.id)!
        .isDefaultShipping,
    ).toBe(true);
    expect(second!.countryCode).toBe("US");

    const updatedFirst = await updateCustomerAddress(customer.id, first!.id, {
      isDefaultBilling: true,
    });
    expect(updatedFirst).not.toBeNull();

    detail = await getCustomer(customer.id);
    expect(
      detail!.addresses.find((address) => address.id === first!.id)!
        .isDefaultBilling,
    ).toBe(true);
    expect(
      detail!.addresses.find((address) => address.id === second!.id)!
        .isDefaultBilling,
    ).toBe(false);

    await expect(deleteCustomerAddress(customer.id, first!.id)).resolves.toBe(
      true,
    );
    await expect(deleteCustomer(customer.id)).resolves.toBe(true);
  });
});
