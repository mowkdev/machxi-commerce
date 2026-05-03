import { z } from 'zod';

// Storefront-shaped catalog DTOs. Distinct from the admin DTOs because they:
//   - Always project a single language (resolved server-side)
//   - Always project a single currency (resolved server-side via price lists +
//     base prices, Medusa-style)
//   - Hide draft/deleted rows
//   - Strip internal fields (priceSetId, inventoryItemId, deletedAt, etc.)

const currencyCode = z
  .string()
  .trim()
  .length(3)
  .regex(/^[A-Z]{3}$/);

export const storeMedia = z.object({
  id: z.string().uuid(),
  url: z.string(),
  thumbnailUrl: z.string().nullable(),
  altText: z.string().nullable(),
  mimeType: z.string(),
});
export type StoreMedia = z.infer<typeof storeMedia>;

export const storePrice = z.object({
  currencyCode: z.string(),
  amount: z.number().int().nonnegative(),
  compareAtAmount: z.number().int().positive().nullable(),
  taxInclusive: z.boolean(),
  source: z.enum(['base', 'price_list']),
});
export type StorePrice = z.infer<typeof storePrice>;

export const storePriceRange = z.object({
  currencyCode: z.string(),
  minAmount: z.number().int().nonnegative(),
  maxAmount: z.number().int().nonnegative(),
});
export type StorePriceRange = z.infer<typeof storePriceRange>;

export const storeProductOptionValue = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
});
export type StoreProductOptionValue = z.infer<typeof storeProductOptionValue>;

export const storeProductOption = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  rank: z.number().int().nonnegative(),
  values: z.array(storeProductOptionValue),
});
export type StoreProductOption = z.infer<typeof storeProductOption>;

export const storeVariant = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  weight: z.number().int().nullable(),
  barcode: z.string().nullable(),
  optionValueIds: z.array(z.string().uuid()),
  price: storePrice.nullable(),
  inStock: z.boolean(),
  availableQuantity: z.number().int().nonnegative(),
  media: z.array(storeMedia),
});
export type StoreVariant = z.infer<typeof storeVariant>;

export const storeProductCategory = z.object({
  id: z.string().uuid(),
  handle: z.string(),
  name: z.string(),
});
export type StoreProductCategory = z.infer<typeof storeProductCategory>;

export const storeProductListItem = z.object({
  id: z.string().uuid(),
  handle: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(['published', 'archived']),
  thumbnail: storeMedia.nullable(),
  priceRange: storePriceRange.nullable(),
  createdAt: z.string(),
});
export type StoreProductListItem = z.infer<typeof storeProductListItem>;

export const storeProductDetail = z.object({
  id: z.string().uuid(),
  handle: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(['published', 'archived']),
  type: z.enum(['simple', 'variable']),
  options: z.array(storeProductOption),
  variants: z.array(storeVariant),
  media: z.array(storeMedia),
  categories: z.array(storeProductCategory),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StoreProductDetail = z.infer<typeof storeProductDetail>;

export const storeListProductsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  currency: currencyCode,
  categoryHandle: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  language: z.string().trim().min(1).optional(),
});
export type StoreListProductsQuery = z.infer<typeof storeListProductsQuery>;

export const storeGetProductQuery = z.object({
  currency: currencyCode,
  language: z.string().trim().min(1).optional(),
});
export type StoreGetProductQuery = z.infer<typeof storeGetProductQuery>;

export const storeProductHandleParam = z.object({
  handle: z.string().trim().min(1),
});
export type StoreProductHandleParam = z.infer<typeof storeProductHandleParam>;

// ── Categories ──────────────────────────────────────────────────────────────

export const storeCategory = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  handle: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  rank: z.number().int().nonnegative(),
});
export type StoreCategory = z.infer<typeof storeCategory>;

export const storeListCategoriesQuery = z.object({
  language: z.string().trim().min(1).optional(),
});
export type StoreListCategoriesQuery = z.infer<typeof storeListCategoriesQuery>;
