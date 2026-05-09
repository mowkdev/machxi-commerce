/**
 * Invoice generator — orchestrates fetching order data, allocating an
 * invoice number, rendering the PDF, uploading to S3, and marking the
 * invoice as issued.
 *
 * Designed to be called from a Temporal activity, with built-in
 * idempotency: if an invoice already exists for the order and is issued,
 * it returns early. If it's in draft, it reuses the number and
 * regenerates the PDF.
 */

import { renderToBuffer } from "@react-pdf/renderer";
import { eq, sql } from "@repo/database";
import { db } from "@repo/database/client";
import {
  invoiceNumberCounter,
  invoices,
  orderItemTaxes,
  orderItems,
  orderLogs,
  orders,
  orderShippingLineTaxes,
  orderShippingLines,
  payments,
  storeSettings,
} from "@repo/database/schema";
import { uploadInvoicePdf } from "../lib/storage";
import {
  InvoiceDocument,
  type InvoiceBankInfo,
  type InvoiceBuyerInfo,
  type InvoiceLineItem,
  type InvoicePdfData,
  type InvoiceSellerInfo,
  type InvoiceShippingLine,
} from "./invoice-pdf";

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

export async function generateInvoice(input: {
  orderId: string;
  paymentId: string;
}): Promise<{ invoiceId: string; invoiceNumber: string }> {
  // 1. Idempotency: check if invoice already exists
  const [existing] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.orderId, input.orderId))
    .limit(1);

  if (existing && existing.status === "issued") {
    return {
      invoiceId: existing.id,
      invoiceNumber: existing.invoiceNumber,
    };
  }

  // 2. Fetch order + related data
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .limit(1);
  if (!order) throw new Error(`Order ${input.orderId} not found`);

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, input.paymentId))
    .limit(1);
  if (!payment) throw new Error(`Payment ${input.paymentId} not found`);

  const [settings] = await db.select().from(storeSettings).limit(1);
  if (!settings) {
    // Retryable: store settings might not be configured yet
    const err = new Error("Store settings not configured — cannot generate invoice");
    (err as Error & { retryable?: boolean }).retryable = true;
    throw err;
  }

  // 3. Fetch line items + taxes
  const itemRows = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, input.orderId));

  const itemIds = itemRows.map((r) => r.id);
  const allItemTaxes =
    itemIds.length > 0
      ? await db
          .select()
          .from(orderItemTaxes)
          .where(sql`${orderItemTaxes.orderItemId} IN ${itemIds}`)
      : [];

  // Group taxes by item
  const taxesByItem = new Map<
    string,
    (typeof allItemTaxes)[number][]
  >();
  for (const tax of allItemTaxes) {
    const list = taxesByItem.get(tax.orderItemId) ?? [];
    list.push(tax);
    taxesByItem.set(tax.orderItemId, list);
  }

  // 4. Fetch shipping lines + taxes
  const shippingRows = await db
    .select()
    .from(orderShippingLines)
    .where(eq(orderShippingLines.orderId, input.orderId));

  const shippingIds = shippingRows.map((r) => r.id);
  const allShippingTaxes =
    shippingIds.length > 0
      ? await db
          .select()
          .from(orderShippingLineTaxes)
          .where(
            sql`${orderShippingLineTaxes.orderShippingLineId} IN ${shippingIds}`,
          )
      : [];

  const taxesByShipping = new Map<
    string,
    (typeof allShippingTaxes)[number][]
  >();
  for (const tax of allShippingTaxes) {
    const list = taxesByShipping.get(tax.orderShippingLineId) ?? [];
    list.push(tax);
    taxesByShipping.set(tax.orderShippingLineId, list);
  }

  // 5. Allocate invoice number (or reuse from existing draft)
  let invoiceNumber: string;
  let invoiceId: string;

  if (existing && existing.status === "draft") {
    invoiceNumber = existing.invoiceNumber;
    invoiceId = existing.id;
  } else {
    const now = new Date();
    const year = now.getFullYear();
    const prefix = settings.invoicePrefix ?? "INV";

    // Allocate number in a serialized transaction
    const allocated = await db.transaction(async (tx) => {
      // Upsert counter for current year
      await tx
        .insert(invoiceNumberCounter)
        .values({ year, lastNumber: 0 })
        .onConflictDoNothing();

      // SELECT FOR UPDATE to serialize
      const [counter] = await tx
        .select()
        .from(invoiceNumberCounter)
        .where(eq(invoiceNumberCounter.year, year))
        .for("update");

      const nextNumber = (counter?.lastNumber ?? 0) + 1;

      await tx
        .update(invoiceNumberCounter)
        .set({ lastNumber: nextNumber })
        .where(eq(invoiceNumberCounter.year, year));

      const num = `${prefix}-${year}-${String(nextNumber).padStart(5, "0")}`;

      // Insert invoice as draft
      const [inv] = await tx
        .insert(invoices)
        .values({
          orderId: input.orderId,
          invoiceNumber: num,
          invoiceDate: now.toISOString(),
          status: "draft",
          subtotal: order.subtotal,
          discountTotal: order.discountTotal,
          shippingTotal: order.shippingTotal,
          taxTotal: order.taxTotal,
          totalAmount: order.totalAmount,
          currencyCode: order.currencyCode,
        })
        .returning();

      return { invoiceNumber: num, invoiceId: inv!.id };
    });

    invoiceNumber = allocated.invoiceNumber;
    invoiceId = allocated.invoiceId;
  }

  // 6. Build PDF data
  const seller: InvoiceSellerInfo = {
    companyName: settings.companyName,
    addressStreet: settings.addressStreet,
    addressCity: settings.addressCity,
    addressZip: settings.addressZip,
    addressCountry: settings.addressCountry,
    taxId: settings.taxId,
    vatNumber: settings.vatNumber,
  };

  const billing = (order.billingAddressSnapshot ?? {}) as Record<
    string,
    unknown
  >;
  const buyer: InvoiceBuyerInfo = {
    name: String(billing.name ?? billing.firstName ?? ""),
    street: billing.street ? String(billing.street) : null,
    city: billing.city ? String(billing.city) : null,
    zip: billing.zip ? String(billing.zip) : null,
    country: billing.country ? String(billing.country) : null,
    email: order.guestEmail ?? null,
  };

  const lineItems: InvoiceLineItem[] = itemRows.map((item) => {
    const taxes = taxesByItem.get(item.id) ?? [];
    const totalTaxAmount = taxes.reduce((sum, t) => sum + t.amount, 0);
    // Use the first tax rate as representative (most orders have one tax rate)
    const taxRate = taxes.length > 0 ? Number(taxes[0]!.rate) : 0;

    return {
      title: item.titleSnapshot,
      variantTitle: item.variantTitleSnapshot,
      sku: item.skuSnapshot,
      quantity: item.quantity,
      unitPrice: item.originalUnitPrice,
      discountPerUnit: item.discountAmountPerUnit,
      finalUnitPrice: item.finalUnitPrice,
      taxRate,
      taxAmount: totalTaxAmount,
      lineTotal: item.finalUnitPrice * item.quantity,
    };
  });

  const shippingLineItems: InvoiceShippingLine[] = shippingRows.map((sl) => {
    const taxes = taxesByShipping.get(sl.id) ?? [];
    const totalTaxAmount = taxes.reduce((sum, t) => sum + t.amount, 0);
    const taxRate = taxes.length > 0 ? Number(taxes[0]!.rate) : 0;

    return {
      name: sl.name,
      amount: sl.finalAmount,
      taxRate,
      taxAmount: totalTaxAmount,
    };
  });

  const isManualInvoice = payment.providerId === "manual_invoice";
  const bankInfo: InvoiceBankInfo | null = isManualInvoice
    ? {
        bankName: settings.bankName,
        iban: settings.iban,
        bic: settings.bic,
        accountHolder: settings.accountHolder,
      }
    : null;

  const invoiceDate = new Date().toISOString().split("T")[0]!;

  const pdfData: InvoicePdfData = {
    invoiceNumber,
    invoiceDate,
    seller,
    buyer,
    items: lineItems,
    shippingLines: shippingLineItems,
    currencyCode: order.currencyCode,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    shippingTotal: order.shippingTotal,
    taxTotal: order.taxTotal,
    totalAmount: order.totalAmount,
    paymentMethod: isManualInvoice ? "Bank Transfer / Invoice" : "Card Payment",
    bankInfo,
    footerText: settings.invoiceFooterText,
  };

  // 7. Render PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    (<InvoiceDocument data={pdfData} />) as any,
  );

  // 8. Upload to S3
  const storageKey = `${input.orderId}/${invoiceNumber}.pdf`;
  await uploadInvoicePdf(storageKey, Buffer.from(pdfBuffer));

  // 9. Mark invoice as issued
  await db
    .update(invoices)
    .set({
      status: "issued",
      pdfStorageKey: storageKey,
    })
    .where(eq(invoices.id, invoiceId));

  // 10. Log
  await db.insert(orderLogs).values({
    orderId: input.orderId,
    eventType: "invoice_generated",
    metadata: {
      invoiceId,
      invoiceNumber,
      storageKey,
    },
  });

  return { invoiceId, invoiceNumber };
}
