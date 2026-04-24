import { z } from 'zod';
import { cartItemsInsert, cartsInsert } from '@repo/database/validators';

// Request bodies accepted from storefront clients. Server-owned columns
// (id, timestamps, cart_id on child rows) are stripped — the server assigns
// them. Currency comes from the cart, not the line item.

export const addToCartBody = cartItemsInsert.pick({
  variantId: true,
  quantity: true,
});
export type AddToCartBody = z.infer<typeof addToCartBody>;

export const updateCartItemBody = z.object({
  quantity: z.number().int().positive(),
});
export type UpdateCartItemBody = z.infer<typeof updateCartItemBody>;

export const createCartBody = cartsInsert.pick({
  currencyCode: true,
});
export type CreateCartBody = z.infer<typeof createCartBody>;

export const applyPromotionBody = z.object({
  code: z.string().min(1).max(64),
});
export type ApplyPromotionBody = z.infer<typeof applyPromotionBody>;

export const checkoutBody = z.object({
  cartId: z.string().uuid(),
  shippingAddressId: z.string().uuid(),
  billingAddressId: z.string().uuid().optional(),
  shippingOptionId: z.string().uuid(),
  promotionCodes: z.array(z.string()).optional(),
});
export type CheckoutBody = z.infer<typeof checkoutBody>;
