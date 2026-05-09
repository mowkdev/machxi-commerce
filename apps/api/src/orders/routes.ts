import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { AppEnv } from "../context";
import { requireAdmin } from "../auth/middleware";
import {
  jsonRequestBody,
  jsonResponse,
  paginatedEnvelope,
  paramsFromSchema,
  standardErrorResponses,
  successEnvelope,
} from "../openapi/envelope";
import {
  cancelOrderController,
  createOrderController,
  createOrderItemController,
  createOrderShippingLineController,
  createPaymentController,
  deleteOrderController,
  deleteOrderItemController,
  deleteOrderShippingLineController,
  deletePaymentController,
  getOrderController,
  listOrdersController,
  markOrderPaidController,
  updateOrderController,
  updateOrderItemController,
  updateOrderShippingLineController,
  updatePaymentController,
} from "./controller";
import {
  createOrderBody,
  listOrdersQuery,
  orderDetail,
  orderIdParam,
  orderItem,
  orderItemInput,
  orderItemParam,
  orderListItem,
  orderPaymentParam,
  orderShippingLine,
  orderShippingLineInput,
  orderShippingLineParam,
  payment,
  paymentInput,
  updateOrderBody,
  updateOrderItemBody,
  updateOrderShippingLineBody,
  updatePaymentBody,
} from "./schema";

export const ordersRoutes = new Hono<AppEnv>();

ordersRoutes.use("*", requireAdmin);

const TAGS = ["orders"];
const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

ordersRoutes.get(
  "/",
  describeRoute({
    operationId: "adminListOrders",
    summary: "List orders",
    tags: TAGS,
    parameters: paramsFromSchema(listOrdersQuery, "query"),
    responses: {
      200: jsonResponse("Page of orders", paginatedEnvelope(orderListItem)),
      ...standardErrorResponses,
    },
  }),
  listOrdersController,
);

ordersRoutes.post(
  "/",
  describeRoute({
    operationId: "adminCreateOrder",
    summary: "Create an order",
    tags: TAGS,
    requestBody: jsonRequestBody(createOrderBody),
    responses: {
      201: jsonResponse("Created order", successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createOrderController,
);

ordersRoutes.get(
  "/:id",
  describeRoute({
    operationId: "adminGetOrder",
    summary: "Get an order",
    tags: TAGS,
    parameters: paramsFromSchema(orderIdParam, "path"),
    responses: {
      200: jsonResponse("Order detail", successEnvelope(orderDetail)),
      ...standardErrorResponses,
    },
  }),
  getOrderController,
);

ordersRoutes.put(
  "/:id",
  describeRoute({
    operationId: "adminUpdateOrder",
    summary: "Update an order",
    tags: TAGS,
    parameters: paramsFromSchema(orderIdParam, "path"),
    requestBody: jsonRequestBody(updateOrderBody),
    responses: {
      200: jsonResponse("Updated order", successEnvelope(orderDetail)),
      ...standardErrorResponses,
    },
  }),
  updateOrderController,
);

ordersRoutes.delete(
  "/:id",
  describeRoute({
    operationId: "adminDeleteOrder",
    summary: "Delete an order",
    tags: TAGS,
    parameters: paramsFromSchema(orderIdParam, "path"),
    responses: {
      200: jsonResponse("Order deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteOrderController,
);

ordersRoutes.post(
  "/:orderId/items",
  describeRoute({
    operationId: "adminCreateOrderItem",
    summary: "Create an order item",
    tags: TAGS,
    parameters: paramsFromSchema(z.object({ orderId: z.string().uuid() }), "path"),
    requestBody: jsonRequestBody(orderItemInput),
    responses: {
      201: jsonResponse("Created order item", successEnvelope(orderItem)),
      ...standardErrorResponses,
    },
  }),
  createOrderItemController,
);

ordersRoutes.put(
  "/:orderId/items/:itemId",
  describeRoute({
    operationId: "adminUpdateOrderItem",
    summary: "Update an order item",
    tags: TAGS,
    parameters: paramsFromSchema(orderItemParam, "path"),
    requestBody: jsonRequestBody(updateOrderItemBody),
    responses: {
      200: jsonResponse("Updated order item", successEnvelope(orderItem)),
      ...standardErrorResponses,
    },
  }),
  updateOrderItemController,
);

ordersRoutes.delete(
  "/:orderId/items/:itemId",
  describeRoute({
    operationId: "adminDeleteOrderItem",
    summary: "Delete an order item",
    tags: TAGS,
    parameters: paramsFromSchema(orderItemParam, "path"),
    responses: {
      200: jsonResponse("Order item deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteOrderItemController,
);

ordersRoutes.post(
  "/:orderId/shipping-lines",
  describeRoute({
    operationId: "adminCreateOrderShippingLine",
    summary: "Create an order shipping line",
    tags: TAGS,
    parameters: paramsFromSchema(z.object({ orderId: z.string().uuid() }), "path"),
    requestBody: jsonRequestBody(orderShippingLineInput),
    responses: {
      201: jsonResponse(
        "Created order shipping line",
        successEnvelope(orderShippingLine),
      ),
      ...standardErrorResponses,
    },
  }),
  createOrderShippingLineController,
);

ordersRoutes.put(
  "/:orderId/shipping-lines/:shippingLineId",
  describeRoute({
    operationId: "adminUpdateOrderShippingLine",
    summary: "Update an order shipping line",
    tags: TAGS,
    parameters: paramsFromSchema(orderShippingLineParam, "path"),
    requestBody: jsonRequestBody(updateOrderShippingLineBody),
    responses: {
      200: jsonResponse(
        "Updated order shipping line",
        successEnvelope(orderShippingLine),
      ),
      ...standardErrorResponses,
    },
  }),
  updateOrderShippingLineController,
);

ordersRoutes.delete(
  "/:orderId/shipping-lines/:shippingLineId",
  describeRoute({
    operationId: "adminDeleteOrderShippingLine",
    summary: "Delete an order shipping line",
    tags: TAGS,
    parameters: paramsFromSchema(orderShippingLineParam, "path"),
    responses: {
      200: jsonResponse("Order shipping line deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteOrderShippingLineController,
);

ordersRoutes.post(
  "/:orderId/payments",
  describeRoute({
    operationId: "adminCreatePayment",
    summary: "Create an order payment",
    tags: TAGS,
    parameters: paramsFromSchema(z.object({ orderId: z.string().uuid() }), "path"),
    requestBody: jsonRequestBody(paymentInput),
    responses: {
      201: jsonResponse("Created payment", successEnvelope(payment)),
      ...standardErrorResponses,
    },
  }),
  createPaymentController,
);

ordersRoutes.put(
  "/:orderId/payments/:paymentId",
  describeRoute({
    operationId: "adminUpdatePayment",
    summary: "Update an order payment",
    tags: TAGS,
    parameters: paramsFromSchema(orderPaymentParam, "path"),
    requestBody: jsonRequestBody(updatePaymentBody),
    responses: {
      200: jsonResponse("Updated payment", successEnvelope(payment)),
      ...standardErrorResponses,
    },
  }),
  updatePaymentController,
);

ordersRoutes.delete(
  "/:orderId/payments/:paymentId",
  describeRoute({
    operationId: "adminDeletePayment",
    summary: "Delete an order payment",
    tags: TAGS,
    parameters: paramsFromSchema(orderPaymentParam, "path"),
    responses: {
      200: jsonResponse("Payment deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deletePaymentController,
);

ordersRoutes.post(
  "/:id/mark-paid",
  describeRoute({
    operationId: "adminMarkOrderPaid",
    summary: "Confirm a manual-invoice payment",
    tags: TAGS,
    parameters: paramsFromSchema(orderIdParam, "path"),
    responses: {
      200: jsonResponse("Order detail after marking paid", successEnvelope(orderDetail)),
      ...standardErrorResponses,
    },
  }),
  markOrderPaidController,
);

ordersRoutes.post(
  "/:id/cancel",
  describeRoute({
    operationId: "adminCancelOrder",
    summary: "Cancel an awaiting-payment order",
    tags: TAGS,
    parameters: paramsFromSchema(orderIdParam, "path"),
    responses: {
      200: jsonResponse("Order detail after cancellation", successEnvelope(orderDetail)),
      ...standardErrorResponses,
    },
  }),
  cancelOrderController,
);
