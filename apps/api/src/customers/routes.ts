import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import {
  createCustomerAddressBody,
  createCustomerBody,
  customerAddress,
  customerDetail,
  customerListItem,
  updateCustomerAddressBody,
  updateCustomerBody,
} from "@repo/types/admin";
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
  createCustomerAddressController,
  createCustomerController,
  deleteCustomerAddressController,
  deleteCustomerController,
  getCustomerController,
  listCustomersController,
  updateCustomerAddressController,
  updateCustomerController,
} from "./controller";
import {
  customerAddressParam,
  customerIdParam,
  listCustomersQuery,
} from "./schema";

export const customersRoutes = new Hono<AppEnv>();

customersRoutes.use("*", requireAdmin);

const TAGS = ["customers"];

const idParameters = paramsFromSchema(customerIdParam, "path");
const addressParameters = paramsFromSchema(customerAddressParam, "path");

const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

customersRoutes.get(
  "/",
  describeRoute({
    operationId: "adminListCustomers",
    summary: "List customers",
    tags: TAGS,
    parameters: paramsFromSchema(listCustomersQuery, "query"),
    responses: {
      200: jsonResponse(
        "Page of customers",
        paginatedEnvelope(customerListItem),
      ),
      ...standardErrorResponses,
    },
  }),
  listCustomersController,
);

customersRoutes.post(
  "/",
  describeRoute({
    operationId: "adminCreateCustomer",
    summary: "Create a customer",
    tags: TAGS,
    requestBody: jsonRequestBody(createCustomerBody),
    responses: {
      201: jsonResponse("Created customer id", successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createCustomerController,
);

customersRoutes.get(
  "/:id",
  describeRoute({
    operationId: "adminGetCustomer",
    summary: "Get a customer",
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse("Customer detail", successEnvelope(customerDetail)),
      ...standardErrorResponses,
    },
  }),
  getCustomerController,
);

customersRoutes.put(
  "/:id",
  describeRoute({
    operationId: "adminUpdateCustomer",
    summary: "Update a customer",
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(updateCustomerBody),
    responses: {
      200: jsonResponse("Updated customer", successEnvelope(customerDetail)),
      ...standardErrorResponses,
    },
  }),
  updateCustomerController,
);

customersRoutes.delete(
  "/:id",
  describeRoute({
    operationId: "adminDeleteCustomer",
    summary: "Delete a customer",
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse("Customer deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteCustomerController,
);

customersRoutes.post(
  "/:customerId/addresses",
  describeRoute({
    operationId: "adminCreateCustomerAddress",
    summary: "Create a customer address",
    tags: TAGS,
    parameters: paramsFromSchema(
      z.object({ customerId: z.string().uuid() }),
      "path",
    ),
    requestBody: jsonRequestBody(createCustomerAddressBody),
    responses: {
      201: jsonResponse(
        "Created customer address",
        successEnvelope(customerAddress),
      ),
      ...standardErrorResponses,
    },
  }),
  createCustomerAddressController,
);

customersRoutes.put(
  "/:customerId/addresses/:addressId",
  describeRoute({
    operationId: "adminUpdateCustomerAddress",
    summary: "Update a customer address",
    tags: TAGS,
    parameters: addressParameters,
    requestBody: jsonRequestBody(updateCustomerAddressBody),
    responses: {
      200: jsonResponse(
        "Updated customer address",
        successEnvelope(customerAddress),
      ),
      ...standardErrorResponses,
    },
  }),
  updateCustomerAddressController,
);

customersRoutes.delete(
  "/:customerId/addresses/:addressId",
  describeRoute({
    operationId: "adminDeleteCustomerAddress",
    summary: "Delete a customer address",
    tags: TAGS,
    parameters: addressParameters,
    responses: {
      200: jsonResponse("Customer address deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteCustomerAddressController,
);
