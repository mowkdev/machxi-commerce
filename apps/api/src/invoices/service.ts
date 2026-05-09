import { eq } from "@repo/database";
import { db } from "@repo/database/client";
import { invoices } from "@repo/database/schema";
import type { InvoiceDetail } from "@repo/types/admin";
import { invoiceStorage } from "../lib/storage";

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

export async function getInvoiceDownloadUrl(
  invoice: InvoiceDetail,
): Promise<string | null> {
  if (!invoice.pdfStorageKey) return null;
  return invoiceStorage.getSignedUrl(invoice.pdfStorageKey, 300);
}
