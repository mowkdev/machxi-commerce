import { z } from "zod";

export const invoiceStatusSchema = z.enum(["draft", "issued", "voided"]);

export const invoiceDetail = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  status: invoiceStatusSchema,
  pdfStorageKey: z.string().nullable(),
  subtotal: z.number(),
  discountTotal: z.number(),
  shippingTotal: z.number(),
  taxTotal: z.number(),
  totalAmount: z.number(),
  currencyCode: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
});
export type InvoiceDetail = z.infer<typeof invoiceDetail>;

export const invoiceListItem = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  status: invoiceStatusSchema,
  totalAmount: z.number(),
  currencyCode: z.string(),
  createdAt: z.string(),
});
export type InvoiceListItem = z.infer<typeof invoiceListItem>;

export const invoiceDownloadResult = z.object({
  downloadUrl: z.string().url(),
});
export type InvoiceDownloadResult = z.infer<typeof invoiceDownloadResult>;
