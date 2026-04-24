import { z } from 'zod';
import { productsSelect, productVariantsSelect, pricesSelect } from '@repo/database/validators';

// Public projection of a product. Storefront never sees 'draft' or 'deleted'
// status rows — but the projected type keeps the status column in case
// front-end consumers want to distinguish 'published' vs 'archived'.

export const publicProduct = productsSelect.pick({
  id: true,
  baseSku: true,
  status: true,
  createdAt: true,
});
export type PublicProduct = z.infer<typeof publicProduct>;

export const publicVariant = productVariantsSelect.pick({
  id: true,
  productId: true,
  sku: true,
  status: true,
  weight: true,
  barcode: true,
});
export type PublicVariant = z.infer<typeof publicVariant>;

export const publicPrice = pricesSelect.pick({
  currencyCode: true,
  amount: true,
  compareAtAmount: true,
  minQuantity: true,
  taxInclusive: true,
});
export type PublicPrice = z.infer<typeof publicPrice>;

export const listProductsQuery = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  currency: z.string().length(3).optional(),
});
export type ListProductsQuery = z.infer<typeof listProductsQuery>;
