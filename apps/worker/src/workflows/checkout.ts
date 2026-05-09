import {
  condition,
  defineSignal,
  log,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";

type CheckoutActivities = {
  compensateAbandonedOrder: (input: {
    orderId: string;
    paymentId: string;
    reason?: "checkout_timeout" | "admin_cancelled" | "customer_cancelled";
  }) => Promise<void>;
  markManualInvoicePaid: (input: {
    orderId: string;
    paymentId: string;
  }) => Promise<void>;
  ensureOrderProcessingIfCaptured: (input: {
    orderId: string;
    paymentId: string;
  }) => Promise<void>;
  generateInvoice: (input: {
    orderId: string;
    paymentId: string;
  }) => Promise<void>;
  sendInvoiceReminder: (input: {
    orderId: string;
    paymentId: string;
    reminderNumber: number;
    reminderTotal: number;
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
export const cancelOrderSignal = defineSignal<
  [reason?: "admin_cancelled" | "customer_cancelled"]
>("cancelOrder");
export const markPaidManualSignal = defineSignal("markPaidManual");

const DAY_MS = 24 * 60 * 60 * 1000;

interface InvoiceTiming {
  /** Total ms from workflow start until auto-cancel. */
  deadlineMs: number;
  /** Sorted offsets from workflow start at which to send reminders, < deadlineMs. */
  reminderOffsetsMs: number[];
}

/**
 * Default Net-7 invoice window with reminder beats at day 3 and day 6 — common
 * SMB/B2C invoice pattern (e.g. Klarna invoice). Workflow code can't read
 * process.env, so per-tenant overrides should arrive via workflow input.
 */
function parseInvoiceTiming(): InvoiceTiming {
  const deadlineDays = 7;
  const reminderDays = [3, 6];
  return {
    deadlineMs: deadlineDays * DAY_MS,
    reminderOffsetsMs: reminderDays
      .filter((d) => d > 0 && d < deadlineDays)
      .map((d) => d * DAY_MS)
      .sort((x, y) => x - y),
  };
}

export async function placeOrderWorkflow(
  input: PlaceOrderWorkflowInput,
): Promise<{ outcome: string }> {
  const isManualInvoice =
    input.providerKind === "manual" &&
    input.providerCode === "manual_invoice";

  // For manual invoice orders, generate the invoice immediately so the
  // customer receives bank/payment details before they pay.
  if (isManualInvoice) {
    try {
      await a.generateInvoice({
        orderId: input.orderId,
        paymentId: input.paymentId,
      });
    } catch (err) {
      log.warn("Invoice generation failed for manual order", {
        orderId: input.orderId,
        error: String(err),
      });
    }
  }

  let webhookSignal = false;
  let cancelled = false;
  let cancelReason: "admin_cancelled" | "customer_cancelled" | undefined;
  let manualPaid = false;

  setHandler(paymentTransactionRecordedSignal, (): void => {
    webhookSignal = true;
  });
  setHandler(cancelOrderSignal, (reason): void => {
    cancelled = true;
    cancelReason = reason ?? "admin_cancelled";
  });
  setHandler(markPaidManualSignal, () => {
    manualPaid = true;
  });

  const settled = (): boolean => webhookSignal || cancelled || manualPaid;

  let progressed: boolean;
  if (isManualInvoice) {
    progressed = await waitForInvoicePayment(input, settled);
  } else {
    progressed = await condition(settled, "30 minutes");
  }

  if (cancelled) {
    await a.compensateAbandonedOrder({
      orderId: input.orderId,
      paymentId: input.paymentId,
      reason: cancelReason ?? "admin_cancelled",
    });
    return { outcome: "cancelled" };
  }

  if (!progressed) {
    await a.compensateAbandonedOrder({
      orderId: input.orderId,
      paymentId: input.paymentId,
      reason: "checkout_timeout",
    });
    return { outcome: "timeout" };
  }

  if (isManualInvoice && manualPaid) {
    await a.markManualInvoicePaid({
      orderId: input.orderId,
      paymentId: input.paymentId,
    });
  }

  await a.ensureOrderProcessingIfCaptured({
    orderId: input.orderId,
    paymentId: input.paymentId,
  });

  // For automatic providers, generate invoice after payment capture.
  if (!isManualInvoice) {
    try {
      await a.generateInvoice({
        orderId: input.orderId,
        paymentId: input.paymentId,
      });
    } catch (err) {
      log.warn("Invoice generation failed after all retries", {
        orderId: input.orderId,
        error: String(err),
      });
    }
  }

  return { outcome: "completed" };
}

/**
 * Best-practice manual-invoice timing: a fixed payment window (default 7d)
 * with intermediate reminder beats. Sleeps until each reminder offset, fires
 * `sendInvoiceReminder`, then continues until the deadline. Returns true if a
 * settling signal arrived before the deadline, false on timeout.
 */
async function waitForInvoicePayment(
  input: PlaceOrderWorkflowInput,
  settled: () => boolean,
): Promise<boolean> {
  const timing = parseInvoiceTiming();
  const startMs = Date.now();
  const reminders = timing.reminderOffsetsMs;
  const reminderTotal = reminders.length;

  for (let i = 0; i < reminders.length; i++) {
    const elapsed = Date.now() - startMs;
    const remaining = reminders[i] - elapsed;
    if (remaining > 0) {
      const woke = await condition(settled, remaining);
      if (woke) return true;
    }
    try {
      await a.sendInvoiceReminder({
        orderId: input.orderId,
        paymentId: input.paymentId,
        reminderNumber: i + 1,
        reminderTotal,
      });
    } catch (err) {
      // Reminders are best-effort; the workflow's job is the deadline.
      log.warn("Invoice reminder dispatch failed", {
        orderId: input.orderId,
        reminderNumber: i + 1,
        error: String(err),
      });
    }
  }

  const finalRemaining = timing.deadlineMs - (Date.now() - startMs);
  if (finalRemaining <= 0) return settled();
  return condition(settled, finalRemaining);
}

/** Exposed for tests. */
export const __testing = { parseInvoiceTiming };
