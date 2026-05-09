import { eq } from "@repo/database";
import { db } from "@repo/database/client";
import { invoices, orders, payments } from "@repo/database/schema";
import type { InvoiceDetail } from "@repo/types/admin";
import { invoiceStorage } from "../lib/storage";
import { startGenerateInvoiceWorkflow } from "../lib/temporal-checkout";

function toDetail(row: typeof invoices.$inferSelect): InvoiceDetail {
  return {
    id: row.id,
    orderId: row.orderId,
    invoiceNumber: row.invoiceNumber,
    invoiceDate: row.invoiceDate,
    status: row.status,
    pdfStorageKey: row.pdfStorageKey,
    subtotal: row.subtotal,
    discountTotal: row.discountTotal,
    shippingTotal: row.shippingTotal,
    taxTotal: row.taxTotal,
    totalAmount: row.totalAmount,
    currencyCode: row.currencyCode,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.createdAt,
  };
}

export async function getInvoiceById(
  id: string,
): Promise<InvoiceDetail | null> {
  const [row] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);
  return row ? toDetail(row) : null;
}

export async function getInvoiceByOrderId(
  orderId: string,
): Promise<InvoiceDetail | null> {
  const [row] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.orderId, orderId))
    .limit(1);
  return row ? toDetail(row) : null;
}

const INVOICE_ELIGIBLE_STATUSES = new Set([
  "processing",
  "completed",
  "partially_refunded",
]);

export async function triggerInvoiceGenerationIfMissing(
  orderId: string,
): Promise<boolean> {
  const [order] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order || !INVOICE_ELIGIBLE_STATUSES.has(order.status)) return false;

  const [payment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .limit(1);
  if (!payment) return false;

  return startGenerateInvoiceWorkflow({
    orderId,
    paymentId: payment.id,
  });
}

export async function getInvoiceDownloadUrl(
  invoice: InvoiceDetail,
): Promise<string | null> {
  if (!invoice.pdfStorageKey) return null;
  return invoiceStorage.getSignedUrl(invoice.pdfStorageKey, 300);
}
