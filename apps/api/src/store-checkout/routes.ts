import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import type { AppEnv } from "../context";
import {
  jsonResponse,
  paramsFromSchema,
  standardErrorResponses,
  successEnvelope,
} from "../openapi/envelope";
import { completeCartController } from "./controller";
import { cartIdParam, placeOrderResult } from "./schema";

export const storeCheckoutRoutes = new Hono<AppEnv>();

const TAGS = ["store-checkout"];

storeCheckoutRoutes.post(
  "/carts/:id/complete",
  describeRoute({
    operationId: "storeCompleteCart",
    summary: "Complete a cart and place an order",
    tags: TAGS,
    parameters: paramsFromSchema(cartIdParam, "path"),
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
