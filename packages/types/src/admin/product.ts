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
  valueId: z.string().uuid().optional(),
  code: z.string().trim().min(1).optional(),
  translations: z.array(optionValueTranslationSchema).default([]),
});

const optionSchema = z.object({
  optionId: z.string().uuid().optional(),
  code: z.string().trim().min(1).optional(),
  translations: z.array(optionTranslationSchema).default([]),
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

// ── Reusable Option Catalog ─────────────────────────────────────────────────

export const listOptionDefinitionsQuery = z.object({
  search: z.string().trim().min(1).optional(),
  languageCode: z.string().min(1).optional(),
});
export type ListOptionDefinitionsQuery = z.infer<typeof listOptionDefinitionsQuery>;

// ── Response schemas ────────────────────────────────────────────────────────

export const productDetailPrice = z.object({
  id: z.string().uuid(),
  currencyCode: z.string().length(3),
  amount: z.number().int().nonnegative(),
  compareAtAmount: z.number().int().nullable(),
  minQuantity: z.number().int().positive(),
  taxInclusive: z.boolean(),
});
export type ProductDetailPrice = z.infer<typeof productDetailPrice>;

export const productDetailOptionValueTranslation = z.object({
  id: z.string().uuid(),
  languageCode: z.string(),
  label: z.string(),
});
export type ProductDetailOptionValueTranslation = z.infer<
  typeof productDetailOptionValueTranslation
>;

export const productDetailOptionValue = z.object({
  // Product-scoped assignment id used by variant_option_values.
  id: z.string().uuid(),
  valueId: z.string().uuid(),
  code: z.string(),
  translations: z.array(productDetailOptionValueTranslation),
});
export type ProductDetailOptionValue = z.infer<typeof productDetailOptionValue>;

export const productDetailOptionTranslation = z.object({
  id: z.string().uuid(),
  languageCode: z.string(),
  name: z.string(),
});
export type ProductDetailOptionTranslation = z.infer<
  typeof productDetailOptionTranslation
>;

export const productDetailOption = z.object({
  // Product-scoped assignment id.
  id: z.string().uuid(),
  optionId: z.string().uuid(),
  code: z.string(),
  rank: z.number().int().nonnegative(),
  translations: z.array(productDetailOptionTranslation),
  values: z.array(productDetailOptionValue),
});
export type ProductDetailOption = z.infer<typeof productDetailOption>;

export const productDetailVariantOptionValue = z.object({
  valueId: z.string().uuid(),
  value: z.object({
    id: z.string().uuid(),
    valueId: z.string().uuid(),
    code: z.string(),
    productOptionId: z.string().uuid(),
    translations: z.array(productDetailOptionValueTranslation),
  }),
});
export type ProductDetailVariantOptionValue = z.infer<
  typeof productDetailVariantOptionValue
>;

export const productDetailInventoryLevel = z.object({
  locationId: z.string().uuid(),
  stockedQuantity: z.number().int(),
});
export type ProductDetailInventoryLevel = z.infer<
  typeof productDetailInventoryLevel
>;

export const productDetailMedia = z.object({
  mediaId: z.string().uuid(),
  rank: z.number().int().nonnegative(),
  media: z.object({
    id: z.string().uuid(),
    url: z.string(),
    mimeType: z.string(),
    altText: z.string().nullable(),
  }),
});
export type ProductDetailMedia = z.infer<typeof productDetailMedia>;

export const productDetailVariant = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  status: z.string(),
  weight: z.number().int().nullable(),
  barcode: z.string().nullable(),
  priceSetId: z.string().uuid(),
  inventoryItemId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  optionValues: z.array(productDetailVariantOptionValue),
  prices: z.array(productDetailPrice),
  inventoryLevels: z.array(productDetailInventoryLevel),
  media: z.array(productDetailMedia),
});
export type ProductDetailVariant = z.infer<typeof productDetailVariant>;

export const productDetailTranslation = z.object({
  id: z.string().uuid(),
  languageCode: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  handle: z.string(),
});
export type ProductDetailTranslation = z.infer<typeof productDetailTranslation>;

export const productDetailCategory = z.object({
  categoryId: z.string().uuid(),
  category: z.object({
    id: z.string().uuid(),
    translations: z.array(
      z.object({
        languageCode: z.string(),
        name: z.string(),
        handle: z.string(),
      })
    ),
  }),
});
export type ProductDetailCategory = z.infer<typeof productDetailCategory>;

export const productDetailResponse = z.object({
  id: z.string().uuid(),
  baseSku: z.string().nullable(),
  status: z.string(),
  type: productTypeSchema,
  taxClassId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  translations: z.array(productDetailTranslation),
  options: z.array(productDetailOption),
  variants: z.array(productDetailVariant),
  media: z.array(productDetailMedia),
  categories: z.array(productDetailCategory),
});
export type ProductDetailResponse = z.infer<typeof productDetailResponse>;

export const optionCatalogValue = z.object({
  id: z.string().uuid(),
  code: z.string(),
  translations: z.array(productDetailOptionValueTranslation),
});
export type OptionCatalogValue = z.infer<typeof optionCatalogValue>;

export const optionCatalogOption = z.object({
  id: z.string().uuid(),
  code: z.string(),
  translations: z.array(productDetailOptionTranslation),
  values: z.array(optionCatalogValue),
});
export type OptionCatalogOption = z.infer<typeof optionCatalogOption>;
