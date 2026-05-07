import { manualInvoiceProvider } from "./manual-invoice";
import { stripeProvider, stripeSecretConfigured } from "./stripe";
import type { PaymentProvider } from "./types";

const builtInByCode = {
  manual_invoice: manualInvoiceProvider,
  stripe: stripeProvider,
} as const satisfies Record<string, PaymentProvider>;

export type BuiltInPaymentProviderCode = keyof typeof builtInByCode;

export function getBuiltInPaymentProvider(
  code: string,
): PaymentProvider | null {
  const key = code.trim().toLowerCase();
  if (key in builtInByCode) {
    return builtInByCode[key as BuiltInPaymentProviderCode];
  }
  return null;
}

/** Throws if PSP credentials are missing for automatic providers */
export function assertProviderRuntimeReady(
  code: string,
  kind: "automatic" | "manual",
): void {
  const normalized = code.trim().toLowerCase();
  if (kind === "automatic" && normalized === "stripe" && !stripeSecretConfigured()) {
    throw new Error(
      "Stripe is not configured: set STRIPE_SECRET_KEY in the API environment.",
    );
  }
}

export { stripeSecretConfigured };
export type { PaymentProvider };
