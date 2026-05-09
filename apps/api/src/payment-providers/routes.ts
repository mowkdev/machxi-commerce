import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import {
  builtInPaymentProviderMeta,
  createPaymentProviderBody,
  paymentProviderDetail,
  paymentProviderListItem,
  updatePaymentProviderBody,
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
  createPaymentProviderController,
  deletePaymentProviderController,
  getPaymentProviderController,
  listBuiltInProvidersController,
  listPaymentProvidersController,
  updatePaymentProviderController,
} from "./controller";
import { listPaymentProvidersQuery, paymentProviderIdParam } from "./schema";

export const paymentProvidersRoutes = new Hono<AppEnv>();

paymentProvidersRoutes.use("*", requireAdmin);

const TAGS = ["payment-providers"];

const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

paymentProvidersRoutes.get(
  "/",
  describeRoute({
    operationId: "adminListPaymentProviders",
    summary: "List payment providers",
    tags: TAGS,
    parameters: paramsFromSchema(listPaymentProvidersQuery, "query"),
    responses: {
      200: jsonResponse(
        "Page of payment providers",
        paginatedEnvelope(paymentProviderListItem),
      ),
      ...standardErrorResponses,
    },
  }),
  listPaymentProvidersController,
);

paymentProvidersRoutes.post(
  "/",
  describeRoute({
    operationId: "adminCreatePaymentProvider",
    summary: "Create a payment provider",
    tags: TAGS,
    requestBody: jsonRequestBody(createPaymentProviderBody),
    responses: {
      201: jsonResponse("Created id", successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createPaymentProviderController,
);

paymentProvidersRoutes.get(
  "/built-in",
  describeRoute({
    operationId: "adminListBuiltInPaymentProviders",
    summary: "List built-in payment provider codes with metadata",
    tags: TAGS,
    responses: {
      200: jsonResponse(
        "Built-in providers",
        successEnvelope(z.array(builtInPaymentProviderMeta)),
      ),
      ...standardErrorResponses,
    },
  }),
  listBuiltInProvidersController,
);

paymentProvidersRoutes.get(
  "/:id",
  describeRoute({
    operationId: "adminGetPaymentProvider",
    summary: "Get a payment provider",
    tags: TAGS,
    parameters: paramsFromSchema(paymentProviderIdParam, "path"),
    responses: {
      200: jsonResponse(
        "Payment provider detail",
        successEnvelope(paymentProviderDetail),
      ),
      ...standardErrorResponses,
    },
  }),
  getPaymentProviderController,
);

paymentProvidersRoutes.put(
  "/:id",
  describeRoute({
    operationId: "adminUpdatePaymentProvider",
    summary: "Update a payment provider",
    tags: TAGS,
    parameters: paramsFromSchema(paymentProviderIdParam, "path"),
    requestBody: jsonRequestBody(updatePaymentProviderBody),
    responses: {
      200: jsonResponse(
        "Updated payment provider",
        successEnvelope(paymentProviderDetail),
      ),
      ...standardErrorResponses,
    },
  }),
  updatePaymentProviderController,
);

paymentProvidersRoutes.delete(
  "/:id",
  describeRoute({
    operationId: "adminDeletePaymentProvider",
    summary: "Delete a payment provider",
    tags: TAGS,
    parameters: paramsFromSchema(paymentProviderIdParam, "path"),
    responses: {
      200: jsonResponse("Deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deletePaymentProviderController,
);
