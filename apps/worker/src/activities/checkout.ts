import Stripe from "stripe";
import { and, eq, sql } from "@repo/database";
import { db } from "@repo/database/client";
import {
  inventoryLevels,
  inventoryTransactions,
  orderItems,
  orderLogs,
  orders,
  payments,
  paymentTransactions,
  productVariants,
} from "@repo/database/schema";

export type CancelReason =
  | "checkout_timeout"
  | "admin_cancelled"
  | "customer_cancelled";

export async function compensateAbandonedOrder(input: {
  orderId: string;
  paymentId: string;
  reason?: CancelReason;
}): Promise<void> {
  const reason: CancelReason = input.reason ?? "checkout_timeout";
  await db.transaction(async (tx) => {
    const [ord] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1);
    if (
      !ord ||
      (ord.status !== "awaiting_payment" && ord.status !== "payment_failed")
    ) {
      return;
    }

    const [pay] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, input.paymentId))
      .limit(1);

    if (
      pay?.providerId === "stripe" &&
      pay.metadata &&
      typeof pay.metadata === "object" &&
      "paymentIntentId" in pay.metadata &&
      typeof pay.metadata.paymentIntentId === "string" &&
      process.env.STRIPE_SECRET_KEY
    ) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        await stripe.paymentIntents.cancel(
          pay.metadata.paymentIntentId,
          {},
          { idempotencyKey: `compensate:${input.orderId}` },
        );
      } catch {
        // Best-effort cancellation
      }
    }

    const items = await tx
      .select({
        variantId: orderItems.variantId,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, input.orderId));

    for (const item of items) {
      if (!item.variantId) continue;
      const [v] = await tx
        .select({ inventoryItemId: productVariants.inventoryItemId })
        .from(productVariants)
        .where(eq(productVariants.id, item.variantId))
        .limit(1);
      if (!v?.inventoryItemId) continue;

      const [lvl] = await tx
        .select({
          locationId: inventoryLevels.locationId,
          inventoryItemId: inventoryLevels.inventoryItemId,
        })
        .from(inventoryLevels)
        .where(eq(inventoryLevels.inventoryItemId, v.inventoryItemId))
        .limit(1);
      if (!lvl) continue;

      await tx
        .update(inventoryLevels)
        .set({
          stockedQuantity: sql`${inventoryLevels.stockedQuantity} + ${item.quantity}`,
        })
        .where(
          and(
            eq(inventoryLevels.inventoryItemId, v.inventoryItemId),
            eq(inventoryLevels.locationId, lvl.locationId),
          ),
        );

      await tx.insert(inventoryTransactions).values({
        inventoryItemId: v.inventoryItemId,
        locationId: lvl.locationId,
        quantity: item.quantity,
        reason: "restock",
        referenceId: input.orderId,
      });
    }

    await tx
      .update(payments)
      .set({ status: "voided" })
      .where(eq(payments.id, input.paymentId));

    await tx
      .update(orders)
      .set({ status: "canceled" })
      .where(eq(orders.id, input.orderId));

    await tx.insert(orderLogs).values({
      orderId: input.orderId,
      eventType: "checkout_abandoned",
      metadata: { paymentId: input.paymentId, reason },
    });
  });
}

/**
 * Records that an invoice reminder is due. Idempotent on (orderId, reminderNumber)
 * via a duplicate-log lookup so workflow retries don't double-send. Email
 * dispatch is intentionally not wired here — the audit log is the seam where a
 * future mailer hooks in.
 */
export async function sendInvoiceReminder(input: {
  orderId: string;
  paymentId: string;
  reminderNumber: number;
  reminderTotal: number;
}): Promise<void> {
  const existing = await db
    .select({ id: orderLogs.id })
    .from(orderLogs)
    .where(
      and(
        eq(orderLogs.orderId, input.orderId),
        eq(orderLogs.eventType, "invoice_reminder_sent"),
        sql`${orderLogs.metadata}->>'reminderNumber' = ${String(input.reminderNumber)}`,
      ),
    )
    .limit(1);
  if (existing.length > 0) return;

  const [ord] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .limit(1);
  if (!ord || ord.status !== "awaiting_payment") return;

  await db.insert(orderLogs).values({
    orderId: input.orderId,
    eventType: "invoice_reminder_sent",
    metadata: {
      paymentId: input.paymentId,
      reminderNumber: input.reminderNumber,
      reminderTotal: input.reminderTotal,
    },
  });
}

export async function markManualInvoicePaid(input: {
  orderId: string;
  paymentId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [ord] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1);
    if (!ord || ord.status !== "awaiting_payment") return;

    const [pay] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, input.paymentId))
      .limit(1);
    if (!pay) return;

    const rid = `${input.orderId}:manual:mark_paid`;
    await tx
      .insert(paymentTransactions)
      .values({
        paymentId: pay.id,
        type: "capture",
        status: "succeeded",
        amount: pay.amount,
        currencyCode: pay.currencyCode,
        remoteId: rid,
      })
      .onConflictDoNothing({ target: paymentTransactions.remoteId });

    await tx
      .update(payments)
      .set({ status: "captured" })
      .where(eq(payments.id, pay.id));

    await tx
      .update(orders)
      .set({ status: "processing" })
      .where(and(eq(orders.id, input.orderId), eq(orders.status, "awaiting_payment")));

    await tx.insert(orderLogs).values({
      orderId: input.orderId,
      eventType: "payment_captured",
      metadata: { source: "manual_invoice_signal", paymentId: pay.id },
    });
  });
}

export async function ensureOrderProcessingIfCaptured(input: {
  orderId: string;
  paymentId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [ord] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1);
    if (!ord || ord.status !== "awaiting_payment") return;

    const [pay] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, input.paymentId))
      .limit(1);
    if (!pay || pay.status !== "captured") return;

    await tx
      .update(orders)
      .set({ status: "processing" })
      .where(and(eq(orders.id, input.orderId), eq(orders.status, "awaiting_payment")));

    await tx.insert(orderLogs).values({
      orderId: input.orderId,
      eventType: "checkout_workflow_finalized",
      metadata: { paymentId: pay.id },
    });
  });
}

export async function generateInvoice(input: {
  orderId: string;
  paymentId: string;
}): Promise<void> {
  const { generateInvoice: gen } = await import(
    "../services/invoice-generator.js"
  );
  await gen(input);
}
