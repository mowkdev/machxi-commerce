import { manualInvoiceProvider } from "./manual-invoice";
import { stripeProvider } from "./stripe";
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

/** Throws if required env vars declared in provider meta are missing. */
export function assertProviderRuntimeReady(
  code: string,
  _kind: "automatic" | "manual",
): void {
  const provider = getBuiltInPaymentProvider(code);
  if (!provider) return;
  const missing = provider.meta.requiredEnvVars.filter(
    (v) => !process.env[v]?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(
      `${provider.meta.displayName} is not configured: set ${missing.join(", ")} in the API environment.`,
    );
  }
}

export function listBuiltInProviderMeta(): Array<{
  code: string;
  displayName: string;
  kind: "automatic" | "manual";
}> {
  return Object.values(builtInByCode).map((p) => ({
    code: p.code,
    displayName: p.meta.displayName,
    kind: p.kind,
  }));
}

export type { PaymentProvider };
