import { z } from 'zod';

// Storefront currency DTO. Tells the storefront which codes to offer in the
// switcher, what to render, and which one to default a new cart to.

export const storeCurrency = z.object({
  code: z.string().length(3),
  name: z.string(),
  symbol: z.string(),
  decimalDigits: z.number().int().min(0).max(4),
  isDefault: z.boolean(),
  displayOrder: z.number().int(),
});
export type StoreCurrency = z.infer<typeof storeCurrency>;

export const storeCurrencies = z.object({
  defaultCode: z.string().length(3),
  items: z.array(storeCurrency),
});
export type StoreCurrencies = z.infer<typeof storeCurrencies>;
