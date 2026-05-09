import { getBuiltInPaymentProvider } from "./providers/registry";

/** Strip secrets from provider config for public storefront responses */
export function sanitizeProviderConfigForStorefront(
  code: string,
  config: Record<string, unknown>,
): Record<string, unknown> {
  const provider = getBuiltInPaymentProvider(code);
  if (!provider) return {};
  const out: Record<string, unknown> = {};
  for (const key of provider.meta.publicConfigKeys) {
    const val = config[key];
    if (val != null) out[key] = val;
  }
  return out;
}
