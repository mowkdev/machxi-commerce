import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import type { AppEnv } from "../context";
import { requireAdmin } from "../auth/middleware";
import {
  jsonResponse,
  paginatedEnvelope,
  paramsFromSchema,
  standardErrorResponses,
  successEnvelope,
} from "../openapi/envelope";
import {
  expireCartController,
  getCartController,
  listCartsController,
} from "./controller";
import {
  adminCartDetail,
  adminCartListItem,
  cartIdParam,
  listCartsQuery,
} from "./schema";

export const adminCartsRoutes = new Hono<AppEnv>();

adminCartsRoutes.use("*", requireAdmin);

const TAGS = ["carts"];

adminCartsRoutes.get(
  "/",
  describeRoute({
    operationId: "adminListCarts",
    summary: "List carts",
    tags: TAGS,
    parameters: paramsFromSchema(listCartsQuery, "query"),
    responses: {
      200: jsonResponse("Page of carts", paginatedEnvelope(adminCartListItem)),
      ...standardErrorResponses,
    },
  }),
  listCartsController,
);

adminCartsRoutes.get(
  "/:id",
  describeRoute({
    operationId: "adminGetCart",
    summary: "Get a cart",
    tags: TAGS,
    parameters: paramsFromSchema(cartIdParam, "path"),
    responses: {
      200: jsonResponse("Cart detail", successEnvelope(adminCartDetail)),
      ...standardErrorResponses,
    },
  }),
  getCartController,
);

adminCartsRoutes.post(
  "/:id/expire",
  describeRoute({
    operationId: "adminExpireCart",
    summary: "Expire a cart and release its inventory reservations",
    tags: TAGS,
    parameters: paramsFromSchema(cartIdParam, "path"),
    responses: {
      200: jsonResponse("Expired cart", successEnvelope(adminCartDetail)),
      ...standardErrorResponses,
    },
  }),
  expireCartController,
);
