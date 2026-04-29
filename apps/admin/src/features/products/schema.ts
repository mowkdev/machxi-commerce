import { z } from 'zod';

export const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  handle: z.string().min(1, 'Handle is required'),
  description: z.string().optional(),
  baseSku: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  // `type` is chosen on create and locked on edit (changing simple↔variable
  // would orphan variants/options — handled by omitting it from the update DTO).
  type: z.enum(['simple', 'variable']),
  taxClassId: z.string().uuid('Select a tax class'),
  categoryIds: z.array(z.string().uuid()).default([]),
});
export type ProductFormValues = z.infer<typeof productFormSchema>;

export const variantFormSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  weight: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  prices: z
    .array(
      z.object({
        currencyCode: z.string().length(3, 'Must be a 3-letter currency code'),
        amount: z.coerce.number().int().nonnegative('Price must be non-negative'),
        compareAtAmount: z.coerce.number().int().positive().optional(),
        minQuantity: z.coerce.number().int().positive().default(1),
        taxInclusive: z.boolean(),
      })
    )
    .min(1, 'At least one price is required'),
});
export type VariantFormValues = z.infer<typeof variantFormSchema>;
