import {
  condition,
  defineSignal,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";

type CheckoutActivities = {
  compensateAbandonedOrder: (input: {
    orderId: string;
    paymentId: string;
  }) => Promise<void>;
  markManualInvoicePaid: (input: {
    orderId: string;
    paymentId: string;
  }) => Promise<void>;
  ensureOrderProcessingIfCaptured: (input: {
    orderId: string;
    paymentId: string;
  }) => Promise<void>;
};

const a = proxyActivities<CheckoutActivities>({
  startToCloseTimeout: "2 minutes",
  retry: {
    maximumAttempts: 10,
    initialInterval: "1s",
    backoffCoefficient: 2,
    maximumInterval: "60s",
  },
});

export interface PlaceOrderWorkflowInput {
  orderId: string;
  paymentId: string;
  providerCode: string;
  providerKind: "automatic" | "manual";
}

/** API / webhooks signal this after `payment_transactions` are written. */
export const paymentTransactionRecordedSignal =
  defineSignal("paymentTransactionRecorded");
export const cancelOrderSignal = defineSignal("cancelOrder");
export const markPaidManualSignal = defineSignal("markPaidManual");

export async function placeOrderWorkflow(
  input: PlaceOrderWorkflowInput,
): Promise<{ outcome: string }> {
  let webhookSignal = false;
  let cancelled = false;
  let manualPaid = false;

  setHandler(paymentTransactionRecordedSignal, (): void => {
    webhookSignal = true;
  });
  setHandler(cancelOrderSignal, () => {
    cancelled = true;
  });
  setHandler(markPaidManualSignal, () => {
    manualPaid = true;
  });

  const deadline = input.providerKind === "manual" ? "14 days" : "30 minutes";
  const progressed = await condition(
    () => webhookSignal || cancelled || manualPaid,
    deadline,
  );

  if (cancelled) {
    await a.compensateAbandonedOrder({
      orderId: input.orderId,
      paymentId: input.paymentId,
    });
    return { outcome: "cancelled" };
  }

  if (!progressed) {
    await a.compensateAbandonedOrder({
      orderId: input.orderId,
      paymentId: input.paymentId,
    });
    return { outcome: "timeout" };
  }

  if (
    manualPaid &&
    input.providerKind === "manual" &&
    input.providerCode === "manual_invoice"
  ) {
    await a.markManualInvoicePaid({
      orderId: input.orderId,
      paymentId: input.paymentId,
    });
  }

  await a.ensureOrderProcessingIfCaptured({
    orderId: input.orderId,
    paymentId: input.paymentId,
  });

  return { outcome: "completed" };
}
