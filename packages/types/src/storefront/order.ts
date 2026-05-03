import { z } from 'zod';

// Customer-facing order projection. Excludes admin-only fields (provider
// metadata, full audit log, internal originating cart id).

export const storeOrderItem = z.object({
  id: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  sku: z.string(),
  title: z.string(),
  variantTitle: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  quantity: z.number().int().positive(),
  taxInclusive: z.boolean(),
  originalUnitPrice: z.number().int().nonnegative(),
  discountAmountPerUnit: z.number().int().nonnegative(),
  finalUnitPrice: z.number().int().nonnegative(),
});
export type StoreOrderItem = z.infer<typeof storeOrderItem>;

export const storeOrderPayment = z.object({
  id: z.string().uuid(),
  amount: z.number().int().nonnegative(),
  currencyCode: z.string(),
  status: z.string(),
});
export type StoreOrderPayment = z.infer<typeof storeOrderPayment>;

export const storeOrderListItem = z.object({
  id: z.string().uuid(),
  displayId: z.string(),
  status: z.string(),
  currencyCode: z.string(),
  totalAmount: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type StoreOrderListItem = z.infer<typeof storeOrderListItem>;

export const storeOrderDetail = z.object({
  id: z.string().uuid(),
  displayId: z.string(),
  status: z.string(),
  currencyCode: z.string(),
  subtotal: z.number().int().nonnegative(),
  discountTotal: z.number().int().nonnegative(),
  shippingTotal: z.number().int().nonnegative(),
  taxTotal: z.number().int().nonnegative(),
  totalAmount: z.number().int().nonnegative(),
  shippingAddressSnapshot: z.record(z.string(), z.unknown()).nullable(),
  billingAddressSnapshot: z.record(z.string(), z.unknown()).nullable(),
  items: z.array(storeOrderItem),
  payments: z.array(storeOrderPayment),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StoreOrderDetail = z.infer<typeof storeOrderDetail>;

export const storeListOrdersQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type StoreListOrdersQuery = z.infer<typeof storeListOrdersQuery>;

export const storeOrderIdParam = z.object({ id: z.string().uuid() });
export type StoreOrderIdParam = z.infer<typeof storeOrderIdParam>;
