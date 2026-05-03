import { describe, expect, it } from "vitest";
import { db } from "@repo/database/client";
import { eq } from "@repo/database";
import { customers } from "@repo/database/schema";
import {
  authenticateCustomer,
  changeCustomerPassword,
  registerCustomer,
  updateCustomerProfile,
} from "../service";

function uniqueEmail() {
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

describe("store-auth profile management", () => {
  it("updates first/last name and phone", async () => {
    const session = await registerCustomer({
      email: uniqueEmail(),
      password: "correct horse battery staple",
      firstName: "Old",
      lastName: "Name",
      phone: null,
    });

    const updated = await updateCustomerProfile(session.customer.id, {
      firstName: "New",
      lastName: "Name",
      phone: "+15551234567",
    });

    expect(updated).not.toBeNull();
    expect(updated!.firstName).toBe("New");
    expect(updated!.phone).toBe("+15551234567");
  });

  it("clears phone when null is passed", async () => {
    const session = await registerCustomer({
      email: uniqueEmail(),
      password: "correct horse battery staple",
      firstName: "Has",
      lastName: "Phone",
      phone: "+15559876543",
    });

    const cleared = await updateCustomerProfile(session.customer.id, {
      phone: null,
    });
    expect(cleared!.phone).toBeNull();
  });

  it("returns null for an unknown customer id", async () => {
    const result = await updateCustomerProfile(
      "00000000-0000-0000-0000-000000000000",
      { firstName: "Ghost" },
    );
    expect(result).toBeNull();
  });

  it("changes password when current password matches", async () => {
    const email = uniqueEmail();
    const session = await registerCustomer({
      email,
      password: "correct horse battery staple",
      firstName: "Pwd",
      lastName: "Change",
      phone: null,
    });

    const outcome = await changeCustomerPassword(session.customer.id, {
      currentPassword: "correct horse battery staple",
      newPassword: "another secure password 123",
    });
    expect(outcome).toEqual({ ok: true });

    const oldOk = await authenticateCustomer({
      email,
      password: "correct horse battery staple",
    });
    expect(oldOk).toBeNull();

    const newOk = await authenticateCustomer({
      email,
      password: "another secure password 123",
    });
    expect(newOk).not.toBeNull();
  });

  it("rejects password change when current password is wrong", async () => {
    const session = await registerCustomer({
      email: uniqueEmail(),
      password: "correct horse battery staple",
      firstName: "Wrong",
      lastName: "Pwd",
      phone: null,
    });

    const outcome = await changeCustomerPassword(session.customer.id, {
      currentPassword: "not the right one",
      newPassword: "doesnt-matter-still-12chars",
    });
    expect(outcome).toEqual({ ok: false, reason: "wrong_password" });
  });

  it("rotates the bcrypt hash on password change", async () => {
    const session = await registerCustomer({
      email: uniqueEmail(),
      password: "correct horse battery staple",
      firstName: "Hash",
      lastName: "Rotate",
      phone: null,
    });
    const before = await db
      .select({ passwordHash: customers.passwordHash })
      .from(customers)
      .where(eq(customers.id, session.customer.id));

    await changeCustomerPassword(session.customer.id, {
      currentPassword: "correct horse battery staple",
      newPassword: "another secure password 123",
    });

    const after = await db
      .select({ passwordHash: customers.passwordHash })
      .from(customers)
      .where(eq(customers.id, session.customer.id));

    expect(after[0].passwordHash).not.toBe(before[0].passwordHash);
  });
});
