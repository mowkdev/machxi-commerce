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
  createShippingOptionController,
  createShippingZoneController,
  deleteShippingOptionController,
  deleteShippingZoneController,
  getShippingOptionController,
  getShippingZoneController,
  listShippingOptionsController,
  listShippingZonesController,
  updateShippingOptionController,
  updateShippingZoneController,
} from "./controller";
import {
  createShippingOptionBody,
  createShippingZoneBody,
  listShippingOptionsQuery,
  listShippingZonesQuery,
  shippingOptionDetail,
  shippingOptionIdParam,
  shippingOptionListItem,
  shippingZoneDetail,
  shippingZoneIdParam,
  shippingZoneListItem,
  updateShippingOptionBody,
  updateShippingZoneBody,
} from "./schema";

export const shippingRoutes = new Hono<AppEnv>();

shippingRoutes.use("*", requireAdmin);

const TAGS = ["shipping"];

const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

shippingRoutes.get(
  "/zones",
  describeRoute({
    operationId: "adminListShippingZones",
    summary: "List shipping zones",
    tags: TAGS,
    parameters: paramsFromSchema(listShippingZonesQuery, "query"),
    responses: {
      200: jsonResponse(
        "Page of shipping zones",
        paginatedEnvelope(shippingZoneListItem),
      ),
      ...standardErrorResponses,
    },
  }),
  listShippingZonesController,
);

shippingRoutes.post(
  "/zones",
  describeRoute({
    operationId: "adminCreateShippingZone",
    summary: "Create a shipping zone",
    tags: TAGS,
    requestBody: jsonRequestBody(createShippingZoneBody),
    responses: {
      201: jsonResponse("Created shipping zone id", successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createShippingZoneController,
);

shippingRoutes.get(
  "/zones/:id",
  describeRoute({
    operationId: "adminGetShippingZone",
    summary: "Get a shipping zone",
    tags: TAGS,
    parameters: paramsFromSchema(shippingZoneIdParam, "path"),
    responses: {
      200: jsonResponse(
        "Shipping zone detail",
        successEnvelope(shippingZoneDetail),
      ),
      ...standardErrorResponses,
    },
  }),
  getShippingZoneController,
);

shippingRoutes.put(
  "/zones/:id",
  describeRoute({
    operationId: "adminUpdateShippingZone",
    summary: "Update a shipping zone",
    tags: TAGS,
    parameters: paramsFromSchema(shippingZoneIdParam, "path"),
    requestBody: jsonRequestBody(updateShippingZoneBody),
    responses: {
      200: jsonResponse(
        "Updated shipping zone",
        successEnvelope(shippingZoneDetail),
      ),
      ...standardErrorResponses,
    },
  }),
  updateShippingZoneController,
);

shippingRoutes.delete(
  "/zones/:id",
  describeRoute({
    operationId: "adminDeleteShippingZone",
    summary: "Delete a shipping zone",
    tags: TAGS,
    parameters: paramsFromSchema(shippingZoneIdParam, "path"),
    responses: {
      200: jsonResponse("Shipping zone deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteShippingZoneController,
);

shippingRoutes.get(
  "/options",
  describeRoute({
    operationId: "adminListShippingOptions",
    summary: "List shipping options",
    tags: TAGS,
    parameters: paramsFromSchema(listShippingOptionsQuery, "query"),
    responses: {
      200: jsonResponse(
        "Page of shipping options",
        paginatedEnvelope(shippingOptionListItem),
      ),
      ...standardErrorResponses,
    },
  }),
  listShippingOptionsController,
);

shippingRoutes.post(
  "/options",
  describeRoute({
    operationId: "adminCreateShippingOption",
    summary: "Create a shipping option",
    tags: TAGS,
    requestBody: jsonRequestBody(createShippingOptionBody),
    responses: {
      201: jsonResponse(
        "Created shipping option id",
        successEnvelope(createAck),
      ),
      ...standardErrorResponses,
    },
  }),
  createShippingOptionController,
);

shippingRoutes.get(
  "/options/:id",
  describeRoute({
    operationId: "adminGetShippingOption",
    summary: "Get a shipping option",
    tags: TAGS,
    parameters: paramsFromSchema(shippingOptionIdParam, "path"),
    responses: {
      200: jsonResponse(
        "Shipping option detail",
        successEnvelope(shippingOptionDetail),
      ),
      ...standardErrorResponses,
    },
  }),
  getShippingOptionController,
);

shippingRoutes.put(
  "/options/:id",
  describeRoute({
    operationId: "adminUpdateShippingOption",
    summary: "Update a shipping option",
    tags: TAGS,
    parameters: paramsFromSchema(shippingOptionIdParam, "path"),
    requestBody: jsonRequestBody(updateShippingOptionBody),
    responses: {
      200: jsonResponse(
        "Updated shipping option",
        successEnvelope(shippingOptionDetail),
      ),
      ...standardErrorResponses,
    },
  }),
  updateShippingOptionController,
);

shippingRoutes.delete(
  "/options/:id",
  describeRoute({
    operationId: "adminDeleteShippingOption",
    summary: "Delete a shipping option",
    tags: TAGS,
    parameters: paramsFromSchema(shippingOptionIdParam, "path"),
    responses: {
      200: jsonResponse("Shipping option deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteShippingOptionController,
);
