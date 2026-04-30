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
  createReturnController,
  createReturnItemController,
  deleteReturnController,
  deleteReturnItemController,
  getReturnController,
  listReturnsController,
  updateReturnController,
  updateReturnItemController,
} from "./controller";
import {
  createReturnBody,
  createReturnItemBody,
  listReturnsQuery,
  returnDetail,
  returnIdParam,
  returnItem,
  returnItemParam,
  returnListItem,
  updateReturnBody,
  updateReturnItemBody,
} from "./schema";

export const returnsRoutes = new Hono<AppEnv>();

returnsRoutes.use("*", requireAdmin);

const TAGS = ["returns"];
const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

returnsRoutes.get(
  "/",
  describeRoute({
    operationId: "adminListReturns",
    summary: "List returns",
    tags: TAGS,
    parameters: paramsFromSchema(listReturnsQuery, "query"),
    responses: {
      200: jsonResponse("Page of returns", paginatedEnvelope(returnListItem)),
      ...standardErrorResponses,
    },
  }),
  listReturnsController,
);

returnsRoutes.post(
  "/",
  describeRoute({
    operationId: "adminCreateReturn",
    summary: "Create a return",
    tags: TAGS,
    requestBody: jsonRequestBody(createReturnBody),
    responses: {
      201: jsonResponse("Created return", successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createReturnController,
);

returnsRoutes.get(
  "/:id",
  describeRoute({
    operationId: "adminGetReturn",
    summary: "Get a return",
    tags: TAGS,
    parameters: paramsFromSchema(returnIdParam, "path"),
    responses: {
      200: jsonResponse("Return detail", successEnvelope(returnDetail)),
      ...standardErrorResponses,
    },
  }),
  getReturnController,
);

returnsRoutes.put(
  "/:id",
  describeRoute({
    operationId: "adminUpdateReturn",
    summary: "Update a return",
    tags: TAGS,
    parameters: paramsFromSchema(returnIdParam, "path"),
    requestBody: jsonRequestBody(updateReturnBody),
    responses: {
      200: jsonResponse("Updated return", successEnvelope(returnDetail)),
      ...standardErrorResponses,
    },
  }),
  updateReturnController,
);

returnsRoutes.delete(
  "/:id",
  describeRoute({
    operationId: "adminDeleteReturn",
    summary: "Delete a return",
    tags: TAGS,
    parameters: paramsFromSchema(returnIdParam, "path"),
    responses: {
      200: jsonResponse("Return deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteReturnController,
);

returnsRoutes.post(
  "/:returnId/items",
  describeRoute({
    operationId: "adminCreateReturnItem",
    summary: "Create a return item",
    tags: TAGS,
    parameters: paramsFromSchema(z.object({ returnId: z.string().uuid() }), "path"),
    requestBody: jsonRequestBody(createReturnItemBody),
    responses: {
      201: jsonResponse("Created return item", successEnvelope(returnItem)),
      ...standardErrorResponses,
    },
  }),
  createReturnItemController,
);

returnsRoutes.put(
  "/:returnId/items/:itemId",
  describeRoute({
    operationId: "adminUpdateReturnItem",
    summary: "Update a return item",
    tags: TAGS,
    parameters: paramsFromSchema(returnItemParam, "path"),
    requestBody: jsonRequestBody(updateReturnItemBody),
    responses: {
      200: jsonResponse("Updated return item", successEnvelope(returnItem)),
      ...standardErrorResponses,
    },
  }),
  updateReturnItemController,
);

returnsRoutes.delete(
  "/:returnId/items/:itemId",
  describeRoute({
    operationId: "adminDeleteReturnItem",
    summary: "Delete a return item",
    tags: TAGS,
    parameters: paramsFromSchema(returnItemParam, "path"),
    responses: {
      200: jsonResponse("Return item deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteReturnItemController,
);
