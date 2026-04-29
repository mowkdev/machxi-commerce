import { z } from 'zod';

// ── Product type ────────────────────────────────────────────────────────────

export const productTypeValues = ['simple', 'variable'] as const;
export const productTypeSchema = z.enum(productTypeValues);
export type ProductType = z.infer<typeof productTypeSchema>;

// ── Shared sub-schemas ──────────────────────────────────────────────────────

const translationSchema = z.object({
  languageCode: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  handle: z.string().min(1),
});

const optionTranslationSchema = z.object({
  languageCode: z.string().min(1),
  name: z.string().min(1),
});

const optionValueTranslationSchema = z.object({
  languageCode: z.string().min(1),
  label: z.string().min(1),
});

const priceSchema = z.object({
  currencyCode: z.string().length(3),
  amount: z.number().int().nonnegative(),
  compareAtAmount: z.number().int().positive().optional(),
  minQuantity: z.number().int().positive().default(1),
  taxInclusive: z.boolean(),
});

const orderedMediaInputSchema = z.object({
  mediaId: z.string().uuid(),
  rank: z.number().int().nonnegative().optional(),
});

const optionValueSchema = z.object({
  translations: z.array(optionValueTranslationSchema).min(1),
});

const optionSchema = z.object({
  translations: z.array(optionTranslationSchema).min(1),
  values: z.array(optionValueSchema).min(1),
});

const variantInputSchema = z.object({
  sku: z.string().min(1),
  weight: z.number().int().nonnegative().optional(),
  barcode: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  optionValueIndices: z.array(z.array(z.number().int().nonnegative())),
  prices: z.array(priceSchema).min(1),
});

// ── Create Product ──────────────────────────────────────────────────────────

export const createProductBody = z.object({
  type: productTypeSchema.default('simple'),
  baseSku: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  taxClassId: z.string().uuid(),
  translations: z.array(translationSchema).min(1),
  categoryIds: z.array(z.string().uuid()).default([]),
  // Options are only meaningful for variable products. Default to none and let
  // the user add them on the edit page after creation.
  options: z.array(optionSchema).default([]),
  // Variants are optional on create. For `simple` products, the server
  // auto-creates a single default variant when none is provided. For
  // `variable` products, variants are added later via the variant editor.
  variants: z.array(variantInputSchema).default([]),
});
export type CreateProductBody = z.infer<typeof createProductBody>;

// ── Update Product (product-level only, variants are independent) ───────────
// NOTE: `type` is intentionally omitted — switching simple↔variable after
// creation is destructive (it would orphan variants/options). If you need to
// change the type, delete and recreate the product.

export const updateProductBody = z.object({
  baseSku: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  taxClassId: z.string().uuid().optional(),
  translations: z.array(translationSchema).min(1).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  media: z.array(orderedMediaInputSchema).optional(),
});
export type UpdateProductBody = z.infer<typeof updateProductBody>;

// ── Update Variant (independent save) ───────────────────────────────────────

export const updateVariantBody = z.object({
  sku: z.string().min(1).optional(),
  weight: z.number().int().nonnegative().nullable().optional(),
  barcode: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  prices: z.array(priceSchema).min(1).optional(),
  media: z.array(orderedMediaInputSchema).optional(),
});
export type UpdateVariantBody = z.infer<typeof updateVariantBody>;

// ── Generate Variants ───────────────────────────────────────────────────────

export const generateVariantsBody = z.object({
  defaultPrices: z.array(priceSchema).default([]),
  defaultWeight: z.number().int().nonnegative().optional(),
  skuPrefix: z.string().optional(),
  options: z.array(optionSchema).optional(),
  regenerate: z.boolean().optional(),
});
export type GenerateVariantsBody = z.infer<typeof generateVariantsBody>;

// ── Response types ──────────────────────────────────────────────────────────

export interface ProductDetailPrice {
  id: string;
  currencyCode: string;
  amount: number;
  compareAtAmount: number | null;
  minQuantity: number;
  taxInclusive: boolean;
}

export interface ProductDetailOptionValueTranslation {
  id: string;
  languageCode: string;
  label: string;
}

export interface ProductDetailOptionValue {
  id: string;
  translations: ProductDetailOptionValueTranslation[];
}

export interface ProductDetailOptionTranslation {
  id: string;
  languageCode: string;
  name: string;
}

export interface ProductDetailOption {
  id: string;
  translations: ProductDetailOptionTranslation[];
  values: ProductDetailOptionValue[];
}

export interface ProductDetailVariantOptionValue {
  valueId: string;
  value: {
    id: string;
    optionId: string;
    translations: ProductDetailOptionValueTranslation[];
  };
}

export interface ProductDetailInventoryLevel {
  locationId: string;
  stockedQuantity: number;
}

export interface ProductDetailMedia {
  mediaId: string;
  rank: number;
  media: {
    id: string;
    url: string;
    mimeType: string;
    altText: string | null;
  };
}

export interface ProductDetailVariant {
  id: string;
  sku: string;
  status: string;
  weight: number | null;
  barcode: string | null;
  priceSetId: string;
  inventoryItemId: string | null;
  createdAt: string;
  updatedAt: string;
  optionValues: ProductDetailVariantOptionValue[];
  prices: ProductDetailPrice[];
  inventoryLevels: ProductDetailInventoryLevel[];
  media: ProductDetailMedia[];
}

export interface ProductDetailTranslation {
  id: string;
  languageCode: string;
  name: string;
  description: string | null;
  handle: string;
}

export interface ProductDetailCategory {
  categoryId: string;
  category: {
    id: string;
    translations: { languageCode: string; name: string; handle: string }[];
  };
}

export interface ProductDetailResponse {
  id: string;
  baseSku: string | null;
  status: string;
  type: ProductType;
  taxClassId: string;
  createdAt: string;
  updatedAt: string;
  translations: ProductDetailTranslation[];
  options: ProductDetailOption[];
  variants: ProductDetailVariant[];
  media: ProductDetailMedia[];
  categories: ProductDetailCategory[];
}
