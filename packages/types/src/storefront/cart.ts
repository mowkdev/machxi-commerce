import { z } from 'zod';

// Storefront cart DTOs. Cart totals are *always* computed server-side and
// projected on every read — clients never set them.

const currencyCode = z
  .string()
  .trim()
  .length(3)
  .regex(/^[A-Z]{3}$/);

export const storeCartTotals = z.object({
  subtotal: z.number().int().nonnegative(),
  discountTotal: z.number().int().nonnegative(),
  shippingTotal: z.number().int().nonnegative(),
  taxTotal: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
export type StoreCartTotals = z.infer<typeof storeCartTotals>;

export const storeCartItem = z.object({
  id: z.string().uuid(),
  variantId: z.string().uuid(),
  productId: z.string().uuid(),
  sku: z.string(),
  title: z.string(),
  variantTitle: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  quantity: z.number().int().positive(),
  taxInclusive: z.boolean(),
  originalUnitPrice: z.number().int().nonnegative(),
  discountAmountPerUnit: z.number().int().nonnegative(),
  finalUnitPrice: z.number().int().nonnegative(),
  lineTotal: z.number().int().nonnegative(),
  lineTax: z.number().int().nonnegative(),
  linePayment: z.number().int().nonnegative(),
});
export type StoreCartItem = z.infer<typeof storeCartItem>;

export const storeCartPromotion = z.object({
  id: z.string().uuid(),
  code: z.string(),
  type: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
  percentageValue: z.string().nullable(),
  appliedAmount: z.number().int().nonnegative(),
});
export type StoreCartPromotion = z.infer<typeof storeCartPromotion>;

export const storeCart = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  currencyCode: z.string(),
  shippingAddressId: z.string().uuid().nullable(),
  billingAddressId: z.string().uuid().nullable(),
  expiresAt: z.string(),
  items: z.array(storeCartItem),
  promotions: z.array(storeCartPromotion),
  totals: storeCartTotals,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StoreCart = z.infer<typeof storeCart>;

export const createCartBody = z.object({
  currencyCode,
});
export type CreateCartBody = z.infer<typeof createCartBody>;

export const addCartLineItemBody = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
});
export type AddCartLineItemBody = z.infer<typeof addCartLineItemBody>;

export const updateCartLineItemBody = z.object({
  quantity: z.number().int().positive(),
});
export type UpdateCartLineItemBody = z.infer<typeof updateCartLineItemBody>;

export const setCartAddressesBody = z.object({
  shippingAddressId: z.string().uuid().nullable().optional(),
  billingAddressId: z.string().uuid().nullable().optional(),
});
export type SetCartAddressesBody = z.infer<typeof setCartAddressesBody>;

export const applyPromotionBody = z.object({
  code: z.string().trim().min(1).max(64),
});
export type ApplyPromotionBody = z.infer<typeof applyPromotionBody>;

export const cartIdParam = z.object({
  id: z.string().uuid(),
});
export type CartIdParam = z.infer<typeof cartIdParam>;

export const cartItemParam = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
});
export type CartItemParam = z.infer<typeof cartItemParam>;

export const cartPromotionParam = z.object({
  id: z.string().uuid(),
  promotionId: z.string().uuid(),
});
export type CartPromotionParam = z.infer<typeof cartPromotionParam>;
