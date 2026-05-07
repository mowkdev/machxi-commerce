/** Strip secrets from provider config for public storefront responses */
export function sanitizeProviderConfigForStorefront(
  code: string,
  config: Record<string, unknown>,
): Record<string, unknown> {
  const c = code.trim().toLowerCase();
  if (c === "stripe") {
    const pk = config.publishableKey;
    return typeof pk === "string" && pk.length > 0 ? { publishableKey: pk } : {};
  }
  if (c === "manual_invoice") {
    const out: Record<string, unknown> = {};
    if (typeof config.termsUrl === "string") out.termsUrl = config.termsUrl;
    if (typeof config.instructions === "string") out.instructions = config.instructions;
    return out;
  }
  return {};
}
