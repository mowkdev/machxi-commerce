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
  createFulfillmentController,
  createFulfillmentItemController,
  deleteFulfillmentController,
  deleteFulfillmentItemController,
  getFulfillmentController,
  listFulfillmentsController,
  updateFulfillmentController,
  updateFulfillmentItemController,
} from "./controller";
import {
  createFulfillmentBody,
  createFulfillmentItemBody,
  fulfillmentDetail,
  fulfillmentIdParam,
  fulfillmentItem,
  fulfillmentItemParam,
  fulfillmentListItem,
  listFulfillmentsQuery,
  updateFulfillmentBody,
  updateFulfillmentItemBody,
} from "./schema";

export const fulfillmentsRoutes = new Hono<AppEnv>();

fulfillmentsRoutes.use("*", requireAdmin);

const TAGS = ["fulfillments"];
const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

fulfillmentsRoutes.get(
  "/",
  describeRoute({
    operationId: "adminListFulfillments",
    summary: "List fulfillments",
    tags: TAGS,
    parameters: paramsFromSchema(listFulfillmentsQuery, "query"),
    responses: {
      200: jsonResponse(
        "Page of fulfillments",
        paginatedEnvelope(fulfillmentListItem),
      ),
      ...standardErrorResponses,
    },
  }),
  listFulfillmentsController,
);

fulfillmentsRoutes.post(
  "/",
  describeRoute({
    operationId: "adminCreateFulfillment",
    summary: "Create a fulfillment",
    tags: TAGS,
    requestBody: jsonRequestBody(createFulfillmentBody),
    responses: {
      201: jsonResponse("Created fulfillment", successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createFulfillmentController,
);

fulfillmentsRoutes.get(
  "/:id",
  describeRoute({
    operationId: "adminGetFulfillment",
    summary: "Get a fulfillment",
    tags: TAGS,
    parameters: paramsFromSchema(fulfillmentIdParam, "path"),
    responses: {
      200: jsonResponse("Fulfillment detail", successEnvelope(fulfillmentDetail)),
      ...standardErrorResponses,
    },
  }),
  getFulfillmentController,
);

fulfillmentsRoutes.put(
  "/:id",
  describeRoute({
    operationId: "adminUpdateFulfillment",
    summary: "Update a fulfillment",
    tags: TAGS,
    parameters: paramsFromSchema(fulfillmentIdParam, "path"),
    requestBody: jsonRequestBody(updateFulfillmentBody),
    responses: {
      200: jsonResponse(
        "Updated fulfillment",
        successEnvelope(fulfillmentDetail),
      ),
      ...standardErrorResponses,
    },
  }),
  updateFulfillmentController,
);

fulfillmentsRoutes.delete(
  "/:id",
  describeRoute({
    operationId: "adminDeleteFulfillment",
    summary: "Delete a fulfillment",
    tags: TAGS,
    parameters: paramsFromSchema(fulfillmentIdParam, "path"),
    responses: {
      200: jsonResponse("Fulfillment deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteFulfillmentController,
);

fulfillmentsRoutes.post(
  "/:fulfillmentId/items",
  describeRoute({
    operationId: "adminCreateFulfillmentItem",
    summary: "Create a fulfillment item",
    tags: TAGS,
    parameters: paramsFromSchema(
      z.object({ fulfillmentId: z.string().uuid() }),
      "path",
    ),
    requestBody: jsonRequestBody(createFulfillmentItemBody),
    responses: {
      201: jsonResponse(
        "Created fulfillment item",
        successEnvelope(fulfillmentItem),
      ),
      ...standardErrorResponses,
    },
  }),
  createFulfillmentItemController,
);

fulfillmentsRoutes.put(
  "/:fulfillmentId/items/:orderItemId",
  describeRoute({
    operationId: "adminUpdateFulfillmentItem",
    summary: "Update a fulfillment item",
    tags: TAGS,
    parameters: paramsFromSchema(fulfillmentItemParam, "path"),
    requestBody: jsonRequestBody(updateFulfillmentItemBody),
    responses: {
      200: jsonResponse(
        "Updated fulfillment item",
        successEnvelope(fulfillmentItem),
      ),
      ...standardErrorResponses,
    },
  }),
  updateFulfillmentItemController,
);

fulfillmentsRoutes.delete(
  "/:fulfillmentId/items/:orderItemId",
  describeRoute({
    operationId: "adminDeleteFulfillmentItem",
    summary: "Delete a fulfillment item",
    tags: TAGS,
    parameters: paramsFromSchema(fulfillmentItemParam, "path"),
    responses: {
      200: jsonResponse("Fulfillment item deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteFulfillmentItemController,
);
