import { z } from 'zod';

const currencyCodeInput = z
  .string()
  .trim()
  .length(3)
  .regex(/^[A-Z]{3}$/);

export const currencyListItem = z.object({
  code: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimalDigits: z.number().int().min(0).max(4),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  displayOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CurrencyListItem = z.infer<typeof currencyListItem>;

export const currencyDetail = currencyListItem;
export type CurrencyDetail = z.infer<typeof currencyDetail>;

export const updateCurrencyBody = z
  .object({
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    displayOrder: z.number().int().optional(),
  })
  .refine((v) => v.isActive !== undefined || v.isDefault !== undefined || v.displayOrder !== undefined, {
    message: 'At least one of isActive, isDefault, displayOrder must be provided',
  });
export type UpdateCurrencyBody = z.infer<typeof updateCurrencyBody>;

/** Body for `POST /admin/currencies`. Code is normalized to uppercase by the API. */
export const createCurrencyBody = z.object({
  code: z
    .string()
    .trim()
    .length(3)
    .regex(/^[A-Za-z]{3}$/, 'Use a 3-letter alphabetic ISO-4217-style code'),
  name: z.string().trim().min(1),
  symbol: z.string().trim().min(1).max(8),
  decimalDigits: z.number().int().min(0).max(4),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});
export type CreateCurrencyBody = z.infer<typeof createCurrencyBody>;

export const currencyCodeParam = z.object({ code: currencyCodeInput });
export type CurrencyCodeParam = z.infer<typeof currencyCodeParam>;
