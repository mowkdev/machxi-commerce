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
import { getOrderController, listOrdersController } from "./controller";
import {
  storeListOrdersQuery,
  storeOrderDetail,
  storeOrderIdParam,
  storeOrderListItem,
} from "./schema";

export const storeOrdersRoutes = new Hono<AppEnv>();

storeOrdersRoutes.use("*", requireCustomer);

const TAGS = ["store-orders"];

storeOrdersRoutes.get(
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

storeOrdersRoutes.get(
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
