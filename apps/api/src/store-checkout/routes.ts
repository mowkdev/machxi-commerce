import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { AppEnv } from "../context";
import {
  jsonRequestBody,
  jsonResponse,
  paramsFromSchema,
  standardErrorResponses,
  successEnvelope,
} from "../openapi/envelope";
import {
  completeCartController,
  listPaymentMethodsController,
} from "./controller";
import {
  cartIdParam,
  completeCartBody,
  placeOrderResult,
  storefrontPaymentMethod,
} from "./schema";

export const storeCheckoutRoutes = new Hono<AppEnv>();

const TAGS = ["store-checkout"];

storeCheckoutRoutes.get(
  "/payment-methods",
  describeRoute({
    operationId: "storeListPaymentMethods",
    summary: "List enabled payment methods for checkout",
    tags: TAGS,
    responses: {
      200: jsonResponse(
        "Payment methods",
        successEnvelope(z.array(storefrontPaymentMethod)),
      ),
      ...standardErrorResponses,
    },
  }),
  listPaymentMethodsController,
);

storeCheckoutRoutes.post(
  "/carts/:id/complete",
  describeRoute({
    operationId: "storeCompleteCart",
    summary: "Complete a cart and place an order",
    tags: TAGS,
    parameters: paramsFromSchema(cartIdParam, "path"),
    requestBody: jsonRequestBody(completeCartBody),
    responses: {
      201: jsonResponse(
        "Order placed",
        successEnvelope(placeOrderResult),
      ),
      ...standardErrorResponses,
    },
  }),
  completeCartController,
);
