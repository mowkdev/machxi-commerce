import { describe, expect, it } from "vitest";
import {
  signCustomerToken,
  verifyCustomerToken,
} from "../../auth/customer-jwt";
import {
  authenticateCustomer,
  getCustomerProfile,
  registerCustomer,
} from "../service";

function uniqueEmail() {
  return `store-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

describe("store-auth service", () => {
  it("registers a customer and issues a verifiable JWT", async () => {
    const email = uniqueEmail();
    const session = await registerCustomer({
      email,
      password: "correct horse battery staple",
      firstName: "Ada",
      lastName: "Lovelace",
      phone: null,
    });

    expect(session.customer.email).toBe(email.toLowerCase());
    expect(session.customer.firstName).toBe("Ada");
    expect(session.token.split(".")).toHaveLength(3);
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(
      (session.customer as unknown as Record<string, unknown>).passwordHash,
    ).toBeUndefined();

    const claims = await verifyCustomerToken(session.token);
    expect(claims).not.toBeNull();
    expect(claims!.customerId).toBe(session.customer.id);
    expect(claims!.email).toBe(email.toLowerCase());
  });

  it("rejects duplicate registrations with a unique violation", async () => {
    const email = uniqueEmail();
    await registerCustomer({
      email,
      password: "correct horse battery staple",
      firstName: "First",
      lastName: "User",
      phone: null,
    });
    await expect(
      registerCustomer({
        email,
        password: "correct horse battery staple",
        firstName: "Second",
        lastName: "User",
        phone: null,
      }),
    ).rejects.toThrow();
  });

  it("authenticates a customer with the right password and rejects wrong ones", async () => {
    const email = uniqueEmail();
    await registerCustomer({
      email,
      password: "correct horse battery staple",
      firstName: "Login",
      lastName: "Test",
      phone: null,
    });

    const ok = await authenticateCustomer({
      email,
      password: "correct horse battery staple",
    });
    expect(ok).not.toBeNull();

    const wrongPassword = await authenticateCustomer({
      email,
      password: "wrong-password",
    });
    expect(wrongPassword).toBeNull();

    const unknownAccount = await authenticateCustomer({
      email: uniqueEmail(),
      password: "anything",
    });
    expect(unknownAccount).toBeNull();
  });

  it("loads a customer profile by id", async () => {
    const email = uniqueEmail();
    const session = await registerCustomer({
      email,
      password: "correct horse battery staple",
      firstName: "Profile",
      lastName: "Test",
      phone: null,
    });
    const profile = await getCustomerProfile(session.customer.id);
    expect(profile).not.toBeNull();
    expect(profile!.email).toBe(email.toLowerCase());
  });

  it("returns null for tampered or invalid JWTs", async () => {
    const session = await registerCustomer({
      email: uniqueEmail(),
      password: "correct horse battery staple",
      firstName: "Token",
      lastName: "Test",
      phone: null,
    });

    const [header, payload, signature] = session.token.split(".");
    const tampered = `${header}.${payload}xx.${signature}`;
    expect(await verifyCustomerToken(tampered)).toBeNull();
    expect(await verifyCustomerToken("not.a.token")).toBeNull();
    expect(await verifyCustomerToken("garbage")).toBeNull();
  });

  it("issued tokens carry the correct subject", async () => {
    const signed = await signCustomerToken({
      customerId: "00000000-0000-0000-0000-000000000000",
      email: "ghost@example.com",
    });
    const claims = await verifyCustomerToken(signed.token);
    expect(claims).toEqual({
      customerId: "00000000-0000-0000-0000-000000000000",
      email: "ghost@example.com",
    });
  });
});
