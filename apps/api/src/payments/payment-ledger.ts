/**
 * Aggregate payment_transactions into payments.status and drive order transitions.
 */

import { and, eq } from "@repo/database";
import {
  orders,
  orderLogs,
  paymentTransactions,
  payments,
} from "@repo/database/schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@repo/database/schema";

type DbTx = NodePgDatabase<typeof schema>;

type PaymentStatus = (typeof payments.$inferSelect)["status"];
type TxType = (typeof paymentTransactions.$inferSelect)["type"];
type TxStatus = (typeof paymentTransactions.$inferSelect)["status"];

function sumSucceededAmount(
  rows: Array<{ type: TxType; status: TxStatus; amount: number }>,
  type: TxType,
): number {
  return rows
    .filter((r) => r.type === type && r.status === "succeeded")
    .reduce((acc, r) => acc + r.amount, 0);
}

export async function recomputePaymentStatus(
  tx: DbTx,
  paymentId: string,
): Promise<PaymentStatus | null> {
  const txs = await tx
    .select({
      type: paymentTransactions.type,
      status: paymentTransactions.status,
      amount: paymentTransactions.amount,
    })
    .from(paymentTransactions)
    .where(eq(paymentTransactions.paymentId, paymentId));

  const [pay] = await tx
    .select({ amount: payments.amount })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);
  if (!pay) return null;

  if (txs.length === 0) return pay ? "pending" : null;

  const captureOk = sumSucceededAmount(txs, "capture");
  const refundOk = sumSucceededAmount(txs, "refund");
  const authOk = sumSucceededAmount(txs, "authorize");
  const voidSucceeded = txs.some(
    (t) => t.type === "void" && t.status === "succeeded",
  );

  let next: PaymentStatus = "pending";
  if (voidSucceeded && captureOk === 0) {
    next = "voided";
  } else if (refundOk >= pay.amount && refundOk > 0) {
    next = "refunded";
  } else if (refundOk > 0) {
    next = "partially_refunded";
  } else if (captureOk >= pay.amount && captureOk > 0) {
    next = "captured";
  } else if (captureOk > 0) {
    next = "authorized";
  } else if (authOk > 0) {
    next = "authorized";
  }

  await tx.update(payments).set({ status: next }).where(eq(payments.id, paymentId));

  return next;
}

export async function applyWebhookTransactions(
  tx: DbTx,
  args: {
    paymentId: string;
    currencyCode: string;
    txs: Array<{
      remoteId: string;
      type: TxType;
      status: TxStatus;
      amount: number;
      currencyCode: string;
    }>;
  },
): Promise<{ paymentStatus: PaymentStatus | null; orderAdvanced: boolean }> {
  for (const t of args.txs) {
    if (t.currencyCode.toUpperCase() !== args.currencyCode.toUpperCase()) {
      continue;
    }
    await tx
      .insert(paymentTransactions)
      .values({
        paymentId: args.paymentId,
        remoteId: t.remoteId,
        type: t.type,
        status: t.status,
        amount: t.amount,
        currencyCode: t.currencyCode.toUpperCase(),
      })
      .onConflictDoNothing({ target: paymentTransactions.remoteId });
  }

  const [prevPay] = await tx
    .select({ status: payments.status })
    .from(payments)
    .where(eq(payments.id, args.paymentId))
    .limit(1);
  const prevStatus = prevPay?.status;

  const nextStatus = await recomputePaymentStatus(tx, args.paymentId);

  let orderAdvanced = false;
  if (nextStatus === "captured" && prevStatus !== "captured") {
    const [pay] = await tx
      .select({ orderId: payments.orderId })
      .from(payments)
      .where(eq(payments.id, args.paymentId))
      .limit(1);
    if (pay) {
      const [ord] = await tx
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.id, pay.orderId))
        .limit(1);
      if (ord?.status === "awaiting_payment") {
        await tx
          .update(orders)
          .set({ status: "processing" })
          .where(
            and(eq(orders.id, pay.orderId), eq(orders.status, "awaiting_payment")),
          );
        await tx.insert(orderLogs).values({
          orderId: pay.orderId,
          eventType: "payment_captured",
          metadata: { paymentId: args.paymentId },
        });
        orderAdvanced = true;
      }
    }
  }

  return { paymentStatus: nextStatus, orderAdvanced };
}
