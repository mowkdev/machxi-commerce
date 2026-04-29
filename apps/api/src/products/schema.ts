import { z } from 'zod';
import type { ProductType } from '@repo/types/admin';

export {
  createProductBody,
  type CreateProductBody,
  updateProductBody,
  type UpdateProductBody,
  updateVariantBody,
  type UpdateVariantBody,
  generateVariantsBody,
  type GenerateVariantsBody,
  listOptionDefinitionsQuery,
  type ListOptionDefinitionsQuery,
  type ProductDetailResponse,
  type OptionCatalogOption,
  productTypeValues,
  type ProductType,
} from '@repo/types/admin';

// ── Query / param schemas ───────────────────────────────────────────────────

export const productStatusValues = ['draft', 'published', 'archived'] as const;

export const listProductsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  status: z.enum(productStatusValues).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'baseSku', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListProductsQuery = z.infer<typeof listProductsQuery>;

export const productIdParam = z.object({
  id: z.string().uuid(),
});

export const variantIdParams = z.object({
  id: z.string().uuid(),
  variantId: z.string().uuid(),
});

export interface ProductListRow {
  id: string;
  baseSku: string | null;
  status: 'draft' | 'published' | 'archived' | 'deleted';
  type: ProductType;
  name: string | null;
  handle: string | null;
  createdAt: string;
  updatedAt: string;
}
