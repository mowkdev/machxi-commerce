import { z } from "zod";

export const orderStatusValues = [
  "pending",
  "awaiting_payment",
  "processing",
  "completed",
  "canceled",
  "refunded",
  "payment_failed",
  "partially_refunded",
] as const;
export const orderStatusSchema = z.enum(orderStatusValues);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const paymentStatusValues = [
  "pending",
  "authorized",
  "captured",
  "partially_refunded",
  "refunded",
  "voided",
] as const;
export const paymentStatusSchema = z.enum(paymentStatusValues);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const fulfillmentStatusValues = [
  "pending",
  "partially_fulfilled",
  "shipped",
  "delivered",
  "canceled",
] as const;
export const fulfillmentStatusSchema = z.enum(fulfillmentStatusValues);
export type FulfillmentStatus = z.infer<typeof fulfillmentStatusSchema>;

export const returnStatusValues = [
  "requested",
  "received",
  "refunded",
  "rejected",
] as const;
export const returnStatusSchema = z.enum(returnStatusValues);
export type ReturnStatus = z.infer<typeof returnStatusSchema>;

export const returnReasonValues = [
  "defective",
  "wrong_size",
  "changed_mind",
  "other",
] as const;
export const returnReasonSchema = z.enum(returnReasonValues);
export type ReturnReason = z.infer<typeof returnReasonSchema>;

const currencyCode = z
  .string()
  .trim()
  .length(3)
  .regex(/^[A-Za-z]{3}$/)
  .transform((value) => value.toUpperCase());

const nullableText = z.string().trim().min(1).nullable().optional();
const jsonRecord = z.record(z.string(), z.unknown());

export const orderItemInput = z.object({
  variantId: z.string().uuid().nullable().optional(),
  skuSnapshot: z.string().trim().min(1),
  titleSnapshot: z.string().trim().min(1),
  variantTitleSnapshot: nullableText,
  originalUnitPrice: z.number().int().nonnegative(),
  discountAmountPerUnit: z.number().int().nonnegative().default(0),
  finalUnitPrice: z.number().int().nonnegative(),
  taxInclusiveSnapshot: z.boolean(),
  quantity: z.number().int().positive(),
  thumbnailUrl: nullableText,
});
export type OrderItemInput = z.infer<typeof orderItemInput>;

export const updateOrderItemBody = orderItemInput.partial();
export type UpdateOrderItemBody = z.infer<typeof updateOrderItemBody>;

export const orderShippingLineInput = z.object({
  shippingOptionId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1),
  originalAmount: z.number().int().nonnegative(),
  discountAmount: z.number().int().nonnegative().default(0),
  finalAmount: z.number().int().nonnegative(),
  taxSnapshot: z.number().int().nonnegative().default(0),
});
export type OrderShippingLineInput = z.infer<typeof orderShippingLineInput>;

export const updateOrderShippingLineBody = orderShippingLineInput.partial();
export type UpdateOrderShippingLineBody = z.infer<
  typeof updateOrderShippingLineBody
>;

export const paymentInput = z.object({
  amount: z.number().int().nonnegative(),
  currencyCode,
  providerId: z.string().trim().min(1),
  status: paymentStatusSchema.default("pending"),
});
export type PaymentInput = z.infer<typeof paymentInput>;

export const updatePaymentBody = paymentInput.partial();
export type UpdatePaymentBody = z.infer<typeof updatePaymentBody>;

export const createOrderBody = z.object({
  displayId: z.string().trim().min(1),
  customerId: z.string().uuid().nullable().optional(),
  originatingCartId: z.string().uuid().nullable().optional(),
  shippingAddressId: z.string().uuid().nullable().optional(),
  billingAddressId: z.string().uuid().nullable().optional(),
  shippingAddressSnapshot: jsonRecord.nullable().optional(),
  billingAddressSnapshot: jsonRecord.nullable().optional(),
  status: orderStatusSchema.default("pending"),
  currencyCode,
  subtotal: z.number().int().nonnegative(),
  discountTotal: z.number().int().nonnegative().default(0),
  shippingTotal: z.number().int().nonnegative().default(0),
  taxTotal: z.number().int().nonnegative().default(0),
  totalAmount: z.number().int().nonnegative(),
  items: z.array(orderItemInput).default([]),
  shippingLines: z.array(orderShippingLineInput).default([]),
  payments: z.array(paymentInput).default([]),
});
export type CreateOrderBody = z.infer<typeof createOrderBody>;

export const updateOrderBody = createOrderBody
  .omit({ items: true, shippingLines: true, payments: true })
  .partial();
export type UpdateOrderBody = z.infer<typeof updateOrderBody>;

export const createFulfillmentItemBody = z.object({
  orderItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
});
export type CreateFulfillmentItemBody = z.infer<
  typeof createFulfillmentItemBody
>;

export const updateFulfillmentItemBody = createFulfillmentItemBody
  .omit({ orderItemId: true })
  .partial();
export type UpdateFulfillmentItemBody = z.infer<
  typeof updateFulfillmentItemBody
>;

export const createFulfillmentBody = z.object({
  orderId: z.string().uuid(),
  locationId: z.string().uuid(),
  status: fulfillmentStatusSchema.default("pending"),
  trackingNum: nullableText,
  carrier: nullableText,
  items: z.array(createFulfillmentItemBody).default([]),
});
export type CreateFulfillmentBody = z.infer<typeof createFulfillmentBody>;

export const updateFulfillmentBody = createFulfillmentBody
  .omit({ orderId: true, items: true })
  .partial();
export type UpdateFulfillmentBody = z.infer<typeof updateFulfillmentBody>;

export const createReturnItemBody = z.object({
  orderItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  reason: returnReasonSchema.nullable().optional(),
});
export type CreateReturnItemBody = z.infer<typeof createReturnItemBody>;

export const updateReturnItemBody = createReturnItemBody
  .omit({ orderItemId: true })
  .partial();
export type UpdateReturnItemBody = z.infer<typeof updateReturnItemBody>;

export const createReturnBody = z.object({
  orderId: z.string().uuid(),
  status: returnStatusSchema.default("requested"),
  items: z.array(createReturnItemBody).default([]),
});
export type CreateReturnBody = z.infer<typeof createReturnBody>;

export const updateReturnBody = createReturnBody
  .omit({ orderId: true, items: true })
  .partial();
export type UpdateReturnBody = z.infer<typeof updateReturnBody>;

export const orderCustomerSummary = z.object({
  id: z.string().uuid(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});
export type OrderCustomerSummary = z.infer<typeof orderCustomerSummary>;

export const orderListItem = z.object({
  id: z.string().uuid(),
  displayId: z.string(),
  customerId: z.string().uuid().nullable(),
  customerEmail: z.string().nullable(),
  customerName: z.string().nullable(),
  status: orderStatusSchema,
  currencyCode: z.string(),
  subtotal: z.number().int(),
  discountTotal: z.number().int(),
  shippingTotal: z.number().int(),
  taxTotal: z.number().int(),
  totalAmount: z.number().int(),
  itemCount: z.number().int().nonnegative(),
  fulfillmentCount: z.number().int().nonnegative(),
  returnCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OrderListItem = z.infer<typeof orderListItem>;

export const orderItem = orderItemInput.extend({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  variantTitleSnapshot: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  createdAt: z.string(),
});
export type OrderItem = z.infer<typeof orderItem>;

export const orderShippingLine = orderShippingLineInput.extend({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  shippingOptionId: z.string().uuid().nullable(),
  createdAt: z.string(),
});
export type OrderShippingLine = z.infer<typeof orderShippingLine>;

export const payment = paymentInput.extend({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  status: paymentStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Payment = z.infer<typeof payment>;

export const fulfillmentItem = z.object({
  fulfillmentId: z.string().uuid(),
  orderItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  createdAt: z.string(),
  orderItem: orderItem.nullable(),
});
export type FulfillmentItem = z.infer<typeof fulfillmentItem>;

export const fulfillmentListItem = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  orderDisplayId: z.string().nullable(),
  locationId: z.string().uuid(),
  locationName: z.string().nullable(),
  status: fulfillmentStatusSchema,
  trackingNum: z.string().nullable(),
  carrier: z.string().nullable(),
  itemCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FulfillmentListItem = z.infer<typeof fulfillmentListItem>;

export const fulfillmentDetail = fulfillmentListItem.extend({
  items: z.array(fulfillmentItem),
});
export type FulfillmentDetail = z.infer<typeof fulfillmentDetail>;

export const returnItem = z.object({
  id: z.string().uuid(),
  returnId: z.string().uuid(),
  orderItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  reason: returnReasonSchema.nullable(),
  createdAt: z.string(),
  orderItem: orderItem.nullable(),
});
export type ReturnItem = z.infer<typeof returnItem>;

export const returnListItem = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  orderDisplayId: z.string().nullable(),
  status: returnStatusSchema,
  itemCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ReturnListItem = z.infer<typeof returnListItem>;

export const returnDetail = returnListItem.extend({
  items: z.array(returnItem),
});
export type ReturnDetail = z.infer<typeof returnDetail>;

export const orderLog = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  eventType: z.string(),
  metadata: jsonRecord.nullable(),
  createdAt: z.string(),
});
export type OrderLog = z.infer<typeof orderLog>;

export const orderDetail = orderListItem.extend({
  originatingCartId: z.string().uuid().nullable(),
  shippingAddressId: z.string().uuid().nullable(),
  billingAddressId: z.string().uuid().nullable(),
  shippingAddressSnapshot: jsonRecord.nullable(),
  billingAddressSnapshot: jsonRecord.nullable(),
  customer: orderCustomerSummary.nullable(),
  items: z.array(orderItem),
  shippingLines: z.array(orderShippingLine),
  payments: z.array(payment),
  fulfillments: z.array(fulfillmentDetail),
  returns: z.array(returnDetail),
  logs: z.array(orderLog),
});
export type OrderDetail = z.infer<typeof orderDetail>;
