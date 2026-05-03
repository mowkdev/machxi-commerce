import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
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
  createAddressController,
  deleteAddressController,
  getAddressController,
  listAddressesController,
  updateAddressController,
} from "./controller";
import {
  address,
  addressIdParam,
  createAddressBody,
  updateAddressBody,
} from "./schema";

export const storeAddressesRoutes = new Hono<AppEnv>();

storeAddressesRoutes.use("*", requireCustomer);

const TAGS = ["store-addresses"];

const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

storeAddressesRoutes.get(
  "/",
  describeRoute({
    operationId: "storeListAddresses",
    summary: "List the current customer's addresses",
    tags: TAGS,
    responses: {
      200: jsonResponse("Customer addresses", successEnvelope(z.array(address))),
      ...standardErrorResponses,
    },
  }),
  listAddressesController,
);

storeAddressesRoutes.post(
  "/",
  describeRoute({
    operationId: "storeCreateAddress",
    summary: "Create an address for the current customer",
    tags: TAGS,
    requestBody: jsonRequestBody(createAddressBody),
    responses: {
      201: jsonResponse("Created address", successEnvelope(address)),
      ...standardErrorResponses,
    },
  }),
  createAddressController,
);

storeAddressesRoutes.get(
  "/:id",
  describeRoute({
    operationId: "storeGetAddress",
    summary: "Get an address belonging to the current customer",
    tags: TAGS,
    parameters: paramsFromSchema(addressIdParam, "path"),
    responses: {
      200: jsonResponse("Address", successEnvelope(address)),
      ...standardErrorResponses,
    },
  }),
  getAddressController,
);

storeAddressesRoutes.put(
  "/:id",
  describeRoute({
    operationId: "storeUpdateAddress",
    summary: "Update an address belonging to the current customer",
    tags: TAGS,
    parameters: paramsFromSchema(addressIdParam, "path"),
    requestBody: jsonRequestBody(updateAddressBody),
    responses: {
      200: jsonResponse("Updated address", successEnvelope(address)),
      ...standardErrorResponses,
    },
  }),
  updateAddressController,
);

storeAddressesRoutes.delete(
  "/:id",
  describeRoute({
    operationId: "storeDeleteAddress",
    summary: "Delete an address belonging to the current customer",
    tags: TAGS,
    parameters: paramsFromSchema(addressIdParam, "path"),
    responses: {
      200: jsonResponse("Address deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteAddressController,
);
