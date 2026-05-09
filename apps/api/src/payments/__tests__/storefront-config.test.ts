import { describe, expect, it } from "vitest";
import { sanitizeProviderConfigForStorefront } from "../storefront-config";

describe("sanitizeProviderConfigForStorefront", () => {
  it("keeps only publicConfigKeys for stripe", () => {
    const result = sanitizeProviderConfigForStorefront("stripe", {
      publishableKey: "pk_test_123",
      secretKey: "sk_test_456",
      webhookSecret: "whsec_789",
    });
    expect(result).toEqual({ publishableKey: "pk_test_123" });
  });

  it("keeps termsUrl and instructions for manual_invoice", () => {
    const result = sanitizeProviderConfigForStorefront("manual_invoice", {
      termsUrl: "https://example.com/terms",
      instructions: "Pay within 30 days",
      internalNote: "admin-only",
    });
    expect(result).toEqual({
      termsUrl: "https://example.com/terms",
      instructions: "Pay within 30 days",
    });
  });

  it("returns empty object for unknown provider code", () => {
    const result = sanitizeProviderConfigForStorefront("paypal", {
      clientId: "abc",
    });
    expect(result).toEqual({});
  });

  it("omits null and undefined values even if key is in publicConfigKeys", () => {
    const result = sanitizeProviderConfigForStorefront("stripe", {
      publishableKey: null,
    });
    expect(result).toEqual({});
  });

  it("omits undefined values", () => {
    const result = sanitizeProviderConfigForStorefront("manual_invoice", {
      termsUrl: undefined,
      instructions: "Pay now",
    });
    expect(result).toEqual({ instructions: "Pay now" });
  });

  it("handles empty config object", () => {
    const result = sanitizeProviderConfigForStorefront("stripe", {});
    expect(result).toEqual({});
  });

  it("is case-insensitive for provider code", () => {
    const result = sanitizeProviderConfigForStorefront("STRIPE", {
      publishableKey: "pk_test_123",
    });
    expect(result).toEqual({ publishableKey: "pk_test_123" });
  });
});
