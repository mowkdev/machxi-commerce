import { z } from 'zod';
import { productsInsert, productsUpdate, productVariantsInsert } from '@repo/database/validators';

// Admin create/update product. `id`, `createdAt`, `updatedAt` are
// server-managed; `status` starts at 'draft' by DB default but can be
// overridden at create time if the admin wants to publish immediately.

export const createProductBody = productsInsert.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateProductBody = z.infer<typeof createProductBody>;

export const updateProductBody = productsUpdate.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type UpdateProductBody = z.infer<typeof updateProductBody>;

export const createVariantBody = productVariantsInsert.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateVariantBody = z.infer<typeof createVariantBody>;
