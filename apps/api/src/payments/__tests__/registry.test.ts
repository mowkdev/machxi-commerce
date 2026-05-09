import { beforeEach, describe, expect, it, vi } from "vitest";
import { manualInvoiceProvider } from "../providers/manual-invoice";
import {
  assertProviderRuntimeReady,
  getBuiltInPaymentProvider,
  listBuiltInProviderMeta,
} from "../providers/registry";
import { stripeProvider } from "../providers/stripe";

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

  it("rejects provider when required env vars are unset", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => assertProviderRuntimeReady("stripe", "automatic")).toThrow(
      /STRIPE_SECRET_KEY/i,
    );
  });

  it("passes when required env vars are set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    expect(() =>
      assertProviderRuntimeReady("stripe", "automatic"),
    ).not.toThrow();
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("providers with no required env vars always pass", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() =>
      assertProviderRuntimeReady("manual_invoice", "manual"),
    ).not.toThrow();
  });

  it("assertProviderRuntimeReady is a no-op for unknown codes", () => {
    expect(() =>
      assertProviderRuntimeReady("paypal", "automatic"),
    ).not.toThrow();
  });

  describe("provider meta", () => {
    it("stripe meta declares required env vars and public config keys", () => {
      expect(stripeProvider.meta.requiredEnvVars).toContain("STRIPE_SECRET_KEY");
      expect(stripeProvider.meta.publicConfigKeys).toContain("publishableKey");
      expect(stripeProvider.meta.displayName).toBe("Stripe");
    });

    it("manual_invoice meta has no required env vars", () => {
      expect(manualInvoiceProvider.meta.requiredEnvVars).toHaveLength(0);
      expect(manualInvoiceProvider.meta.publicConfigKeys).toContain("termsUrl");
      expect(manualInvoiceProvider.meta.publicConfigKeys).toContain("instructions");
      expect(manualInvoiceProvider.meta.displayName).toBe("Manual Invoice");
    });
  });

  describe("listBuiltInProviderMeta", () => {
    it("returns all registered providers with code, displayName, and kind", () => {
      const meta = listBuiltInProviderMeta();
      expect(meta).toEqual(
        expect.arrayContaining([
          { code: "stripe", displayName: "Stripe", kind: "automatic" },
          { code: "manual_invoice", displayName: "Manual Invoice", kind: "manual" },
        ]),
      );
      expect(meta.length).toBeGreaterThanOrEqual(2);
    });
  });
});
