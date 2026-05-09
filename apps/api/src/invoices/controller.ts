import type { Context } from "hono";
import type { AppEnv } from "../context";
import { notFound, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import {
  getInvoiceById,
  getInvoiceByOrderId,
  getInvoiceDownloadUrl,
  triggerInvoiceGenerationIfMissing,
} from "./service";
import { z } from "zod";

const idParam = z.object({ id: z.string().uuid() });
const orderIdParam = z.object({ orderId: z.string().uuid() });

export async function getInvoiceController(c: Context<AppEnv>) {
  const parsed = idParam.safeParse({ id: c.req.param("id") });
  if (!parsed.success)
    throw validationFailed("Invalid invoice ID", {
      issues: parsed.error.issues,
    });
  const invoice = await getInvoiceById(parsed.data.id);
  if (!invoice) throw notFound("Invoice not found");
  return ok(c, invoice);
}

export async function getInvoiceByOrderController(c: Context<AppEnv>) {
  const parsed = orderIdParam.safeParse({ orderId: c.req.param("orderId") });
  if (!parsed.success)
    throw validationFailed("Invalid order ID", {
      issues: parsed.error.issues,
    });
  const invoice = await getInvoiceByOrderId(parsed.data.orderId);
  if (!invoice) {
    await triggerInvoiceGenerationIfMissing(parsed.data.orderId);
    throw notFound("Invoice not found for this order");
  }
  return ok(c, invoice);
}

export async function retryInvoiceByOrderController(c: Context<AppEnv>) {
  const parsed = orderIdParam.safeParse({ orderId: c.req.param("orderId") });
  if (!parsed.success)
    throw validationFailed("Invalid order ID", {
      issues: parsed.error.issues,
    });
  const existing = await getInvoiceByOrderId(parsed.data.orderId);
  if (existing) return ok(c, existing);
  const triggered = await triggerInvoiceGenerationIfMissing(parsed.data.orderId);
  if (!triggered) throw notFound("Order not eligible for invoice generation");
  return c.json({ ok: true, message: "Invoice generation triggered" }, 202);
}

export async function downloadInvoiceController(c: Context<AppEnv>) {
  const parsed = idParam.safeParse({ id: c.req.param("id") });
  if (!parsed.success)
    throw validationFailed("Invalid invoice ID", {
      issues: parsed.error.issues,
    });
  const invoice = await getInvoiceById(parsed.data.id);
  if (!invoice) throw notFound("Invoice not found");
  const downloadUrl = await getInvoiceDownloadUrl(invoice);
  if (!downloadUrl) throw notFound("Invoice PDF not available");
  return ok(c, { downloadUrl });
}
