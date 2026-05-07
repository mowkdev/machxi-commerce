import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import type { AppEnv } from "../context";
import { requireCustomer } from "../auth/middleware";
import {
  jsonRequestBody,
  jsonResponse,
  paramsFromSchema,
  standardErrorResponses,
  successEnvelope,
} from "../openapi/envelope";
import {
  addCartLineItemController,
  applyCartPromotionController,
  attachCustomerToCartController,
  createCartController,
  getCartController,
  removeCartLineItemController,
  removeCartPromotionController,
  setCartAddressesController,
  switchCartCurrencyController,
  updateCartLineItemController,
} from "./controller";
import {
  addCartLineItemBody,
  applyPromotionBody,
  cartIdParam,
  cartItemParam,
  cartPromotionParam,
  createCartBody,
  setCartAddressesBody,
  storeCart,
  switchCartCurrencyBody,
  updateCartLineItemBody,
} from "./schema";

export const storeCartsRoutes = new Hono<AppEnv>();

const TAGS = ["store-carts"];

storeCartsRoutes.post(
  "/",
  describeRoute({
    operationId: "storeCreateCart",
    summary: "Create a cart",
    tags: TAGS,
    requestBody: jsonRequestBody(createCartBody),
    responses: {
      201: jsonResponse("Cart", successEnvelope(storeCart)),
      ...standardErrorResponses,
    },
  }),
  createCartController,
);

storeCartsRoutes.get(
  "/:id",
  describeRoute({
    operationId: "storeGetCart",
    summary: "Get a cart by id",
    tags: TAGS,
    parameters: paramsFromSchema(cartIdParam, "path"),
    responses: {
      200: jsonResponse("Cart", successEnvelope(storeCart)),
      ...standardErrorResponses,
    },
  }),
  getCartController,
);

storeCartsRoutes.post(
  "/:id/line-items",
  describeRoute({
    operationId: "storeAddCartLineItem",
    summary: "Add a line item to the cart",
    tags: TAGS,
    parameters: paramsFromSchema(cartIdParam, "path"),
    requestBody: jsonRequestBody(addCartLineItemBody),
    responses: {
      200: jsonResponse("Cart", successEnvelope(storeCart)),
      ...standardErrorResponses,
    },
  }),
  addCartLineItemController,
);

storeCartsRoutes.patch(
  "/:id/line-items/:itemId",
  describeRoute({
    operationId: "storeUpdateCartLineItem",
    summary: "Update a line item's quantity",
    tags: TAGS,
    parameters: paramsFromSchema(cartItemParam, "path"),
    requestBody: jsonRequestBody(updateCartLineItemBody),
    responses: {
      200: jsonResponse("Cart", successEnvelope(storeCart)),
      ...standardErrorResponses,
    },
  }),
  updateCartLineItemController,
);

storeCartsRoutes.delete(
  "/:id/line-items/:itemId",
  describeRoute({
    operationId: "storeRemoveCartLineItem",
    summary: "Remove a line item",
    tags: TAGS,
    parameters: paramsFromSchema(cartItemParam, "path"),
    responses: {
      200: jsonResponse("Cart", successEnvelope(storeCart)),
      ...standardErrorResponses,
    },
  }),
  removeCartLineItemController,
);

storeCartsRoutes.post(
  "/:id/addresses",
  describeRoute({
    operationId: "storeSetCartAddresses",
    summary: "Set the shipping/billing addresses for the cart",
    tags: TAGS,
    parameters: paramsFromSchema(cartIdParam, "path"),
    requestBody: jsonRequestBody(setCartAddressesBody),
    responses: {
      200: jsonResponse("Cart", successEnvelope(storeCart)),
      ...standardErrorResponses,
    },
  }),
  setCartAddressesController,
);

storeCartsRoutes.post(
  "/:id/currency",
  describeRoute({
    operationId: "storeSwitchCartCurrency",
    summary: "Switch the cart's currency (empties items and promotions)",
    tags: TAGS,
    parameters: paramsFromSchema(cartIdParam, "path"),
    requestBody: jsonRequestBody(switchCartCurrencyBody),
    responses: {
      200: jsonResponse("Cart", successEnvelope(storeCart)),
      ...standardErrorResponses,
    },
  }),
  switchCartCurrencyController,
);

storeCartsRoutes.post(
  "/:id/promotions",
  describeRoute({
    operationId: "storeApplyCartPromotion",
    summary: "Apply a promotion code to the cart",
    tags: TAGS,
    parameters: paramsFromSchema(cartIdParam, "path"),
    requestBody: jsonRequestBody(applyPromotionBody),
    responses: {
      200: jsonResponse("Cart", successEnvelope(storeCart)),
      ...standardErrorResponses,
    },
  }),
  applyCartPromotionController,
);

storeCartsRoutes.delete(
  "/:id/promotions/:promotionId",
  describeRoute({
    operationId: "storeRemoveCartPromotion",
    summary: "Remove a promotion from the cart",
    tags: TAGS,
    parameters: paramsFromSchema(cartPromotionParam, "path"),
    responses: {
      200: jsonResponse("Cart", successEnvelope(storeCart)),
      ...standardErrorResponses,
    },
  }),
  removeCartPromotionController,
);

// Authenticated-only endpoint: a logged-in customer claims a guest cart.
const customerCartRouter = new Hono<AppEnv>();
customerCartRouter.use("*", requireCustomer);
customerCartRouter.post(
  "/:id/customer",
  describeRoute({
    operationId: "storeAttachCustomerToCart",
    summary: "Attach the authenticated customer to a guest cart",
    tags: TAGS,
    parameters: paramsFromSchema(cartIdParam, "path"),
    responses: {
      200: jsonResponse("Cart", successEnvelope(storeCart)),
      ...standardErrorResponses,
    },
  }),
  attachCustomerToCartController,
);
storeCartsRoutes.route("/", customerCartRouter);
