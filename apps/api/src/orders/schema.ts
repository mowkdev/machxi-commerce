import { z } from "zod";

export {
  createOrderBody,
  orderItemInput,
  orderDetail,
  orderItem,
  orderShippingLineInput,
  orderListItem,
  orderShippingLine,
  paymentInput,
  payment,
  updateOrderBody,
  updateOrderItemBody,
  updateOrderShippingLineBody,
  updatePaymentBody,
  type CreateOrderBody,
  type OrderItemInput,
  type OrderDetail,
  type OrderItem,
  type OrderShippingLineInput,
  type OrderListItem,
  type OrderShippingLine,
  type PaymentInput,
  type Payment,
  type UpdateOrderBody,
  type UpdateOrderItemBody,
  type UpdateOrderShippingLineBody,
  type UpdatePaymentBody,
} from "@repo/types/admin";

export const listOrdersQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  status: z
    .enum([
      "pending",
      "awaiting_payment",
      "processing",
      "completed",
      "canceled",
      "refunded",
      "payment_failed",
      "partially_refunded",
    ])
    .optional(),
  customerId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sortBy: z
    .enum(["displayId", "status", "totalAmount", "createdAt", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuery>;

export const orderIdParam = z.object({
  id: z.string().uuid(),
});

export const orderItemParam = z.object({
  orderId: z.string().uuid(),
  itemId: z.string().uuid(),
});

export const orderShippingLineParam = z.object({
  orderId: z.string().uuid(),
  shippingLineId: z.string().uuid(),
});

export const orderPaymentParam = z.object({
  orderId: z.string().uuid(),
  paymentId: z.string().uuid(),
});
