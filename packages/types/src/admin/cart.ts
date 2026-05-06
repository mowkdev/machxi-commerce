import { z } from "zod";
import { storeCartItem, storeCartPromotion, storeCartTotals } from "../storefront/cart";
import { customerAddress } from "./customer";

export const adminCartListItem = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  customerEmail: z.string().nullable(),
  customerName: z.string().nullable(),
  currencyCode: z.string(),
  itemCount: z.number().int().nonnegative(),
  subtotal: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  isExpired: z.boolean(),
  expiresAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminCartListItem = z.infer<typeof adminCartListItem>;

export const adminCartDetail = adminCartListItem.extend({
  shippingAddress: customerAddress.nullable(),
  billingAddress: customerAddress.nullable(),
  items: z.array(storeCartItem),
  promotions: z.array(storeCartPromotion),
  totals: storeCartTotals,
});
export type AdminCartDetail = z.infer<typeof adminCartDetail>;
