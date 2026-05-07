// Storefront currencies projection — what the switcher offers and what a
// brand-new cart should default to.

import type { StoreCurrencies, StoreCurrency } from "@repo/types/storefront";
import { getDefaultCurrency, loadActiveCurrencies } from "../lib/currency";

export async function listStoreCurrencies(): Promise<StoreCurrencies> {
  const [active, defaultRow] = await Promise.all([
    loadActiveCurrencies(),
    getDefaultCurrency(),
  ]);

  if (active.length === 0) {
    throw new Error("No active currencies configured");
  }

  // Default is whatever has is_default=true, falling back to the first active
  // row when the operator has somehow cleared the default flag.
  const defaultCode = defaultRow?.code ?? active[0].code;

  const items: StoreCurrency[] = active.map((c) => ({
    code: c.code,
    name: c.name,
    symbol: c.symbol,
    decimalDigits: c.decimalDigits,
    isDefault: c.code === defaultCode,
    displayOrder: c.displayOrder,
  }));

  return { defaultCode, items };
}
