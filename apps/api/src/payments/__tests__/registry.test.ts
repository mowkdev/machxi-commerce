import { beforeEach, describe, expect, it, vi } from "vitest";
import { manualInvoiceProvider } from "../providers/manual-invoice";
import {
  assertProviderRuntimeReady,
  getBuiltInPaymentProvider,
  stripeSecretConfigured,
} from "../providers/registry";

describe("payment registry", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("manual_invoice createSession returns null remoteId", async () => {
    const result = await manualInvoiceProvider.createSession({
      paymentId: "pay-1",
      orderId: "ord-1",
      amount: 100,
      currencyCode: "USD",
      idempotencyKey: "k1",
      config: {},
    });
    expect(result.remoteId).toBeNull();
    expect(result.clientPayload).toMatchObject({
      kind: "manual_invoice",
    });
  });

  it("getBuiltInPaymentProvider returns null for unknown code", () => {
    expect(getBuiltInPaymentProvider("paypal")).toBeNull();
  });

  it("getBuiltInPaymentProvider returns stripe for stripe", () => {
    expect(getBuiltInPaymentProvider("stripe")?.code).toBe("stripe");
  });

  it("stripe is rejected when STRIPE_SECRET_KEY is unset", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(stripeSecretConfigured()).toBe(false);
    expect(() => assertProviderRuntimeReady("stripe", "automatic")).toThrow(
      /STRIPE_SECRET_KEY/i,
    );
  });

  it("stripe passes when STRIPE_SECRET_KEY is set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    expect(stripeSecretConfigured()).toBe(true);
    expect(() =>
      assertProviderRuntimeReady("stripe", "automatic"),
    ).not.toThrow();
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("manual_invoice never requires stripe key", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() =>
      assertProviderRuntimeReady("manual_invoice", "manual"),
    ).not.toThrow();
  });
});
