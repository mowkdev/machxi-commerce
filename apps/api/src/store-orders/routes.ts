import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import type { AppEnv } from "../context";
import { requireCustomer } from "../auth/middleware";
import {
  jsonResponse,
  paginatedEnvelope,
  paramsFromSchema,
  standardErrorResponses,
  successEnvelope,
} from "../openapi/envelope";
import {
  getOrderConfirmationController,
  getOrderController,
  listOrdersController,
} from "./controller";
import {
  storeListOrdersQuery,
  storeOrderDetail,
  storeOrderIdParam,
  storeOrderListItem,
} from "./schema";

export const storeOrdersRoutes = new Hono<AppEnv>();

const TAGS = ["store-orders"];

// Public: post-checkout confirmation page — access gated by unguessable UUID
storeOrdersRoutes.get(
  "/:id/confirmation",
  describeRoute({
    operationId: "storeGetOrderConfirmation",
    summary: "Get order details for the post-checkout confirmation page (no auth required)",
    tags: TAGS,
    parameters: paramsFromSchema(storeOrderIdParam, "path"),
    responses: {
      200: jsonResponse("Order detail", successEnvelope(storeOrderDetail)),
      ...standardErrorResponses,
    },
  }),
  getOrderConfirmationController,
);

// Protected: customer's own orders
const myOrdersRouter = new Hono<AppEnv>();
myOrdersRouter.use("*", requireCustomer);

myOrdersRouter.get(
  "/",
  describeRoute({
    operationId: "storeListMyOrders",
    summary: "List the current customer's orders",
    tags: TAGS,
    parameters: paramsFromSchema(storeListOrdersQuery, "query"),
    responses: {
      200: jsonResponse("Page of orders", paginatedEnvelope(storeOrderListItem)),
      ...standardErrorResponses,
    },
  }),
  listOrdersController,
);

myOrdersRouter.get(
  "/:id",
  describeRoute({
    operationId: "storeGetMyOrder",
    summary: "Get an order belonging to the current customer",
    tags: TAGS,
    parameters: paramsFromSchema(storeOrderIdParam, "path"),
    responses: {
      200: jsonResponse("Order detail", successEnvelope(storeOrderDetail)),
      ...standardErrorResponses,
    },
  }),
  getOrderController,
);

storeOrdersRoutes.route("/", myOrdersRouter);
