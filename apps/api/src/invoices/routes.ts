import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { invoiceDetail, invoiceDownloadResult } from "@repo/types/admin";
import type { AppEnv } from "../context";
import { requireAdmin } from "../auth/middleware";
import {
  jsonResponse,
  standardErrorResponses,
  successEnvelope,
} from "../openapi/envelope";
import {
  getInvoiceController,
  getInvoiceByOrderController,
  downloadInvoiceController,
  retryInvoiceByOrderController,
} from "./controller";

export const invoicesRoutes = new Hono<AppEnv>();

invoicesRoutes.use("*", requireAdmin);

const TAGS = ["invoices"];

invoicesRoutes.get(
  "/by-order/:orderId",
  describeRoute({
    operationId: "adminGetInvoiceByOrder",
    summary: "Get invoice by order ID",
    tags: TAGS,
    responses: {
      200: jsonResponse("Invoice detail", successEnvelope(invoiceDetail)),
      ...standardErrorResponses,
    },
  }),
  getInvoiceByOrderController,
);

invoicesRoutes.post(
  "/by-order/:orderId/retry",
  describeRoute({
    operationId: "adminRetryInvoiceGeneration",
    summary: "Retry invoice generation for an order",
    tags: TAGS,
    responses: {
      200: jsonResponse("Invoice already exists", successEnvelope(invoiceDetail)),
      202: { description: "Invoice generation triggered" },
      ...standardErrorResponses,
    },
  }),
  retryInvoiceByOrderController,
);

invoicesRoutes.get(
  "/:id/download",
  describeRoute({
    operationId: "adminDownloadInvoice",
    summary: "Get a signed download URL for an invoice PDF",
    tags: TAGS,
    responses: {
      200: jsonResponse(
        "Signed download URL",
        successEnvelope(invoiceDownloadResult),
      ),
      ...standardErrorResponses,
    },
  }),
  downloadInvoiceController,
);

invoicesRoutes.get(
  "/:id",
  describeRoute({
    operationId: "adminGetInvoice",
    summary: "Get invoice by ID",
    tags: TAGS,
    responses: {
      200: jsonResponse("Invoice detail", successEnvelope(invoiceDetail)),
      ...standardErrorResponses,
    },
  }),
  getInvoiceController,
);
