/**
 * Temporal integration for checkout workflows.
 *
 * Two callsite shapes:
 *  - `startPlaceOrderWorkflow` is fire-and-forget at order creation; the API
 *    catches failures so a Temporal outage doesn't break checkout.
 *  - `signalPlaceOrder*` are admin/webhook actions that MUST land. They use
 *    `signalWithStart` so a missing workflow (e.g. the API was restarted
 *    mid-checkout, or Temporal was briefly down) is recovered transparently:
 *    the workflow is started fresh and the signal is delivered to it. They
 *    surface errors to the caller — silent drop here is what gets paid orders
 *    auto-cancelled at the deadline.
 */

import { WorkflowIdReusePolicy } from "@temporalio/common";
import { env } from "../env";
import { logger } from "./logger";

export class TemporalUnavailableError extends Error {
  constructor() {
    super("Temporal service is unavailable — try again later");
    this.name = "TemporalUnavailableError";
  }
}

/** Returns the client if Temporal is configured and reachable, null if not configured.
 *  Throws TemporalUnavailableError if TEMPORAL_ADDRESS is set but the connection failed. */
async function getRequiredClient(): Promise<
  import("@temporalio/client").Client | null
> {
  if (!env.TEMPORAL_ADDRESS?.trim()) return null;
  const client = await getTemporalClient();
  if (!client) throw new TemporalUnavailableError();
  return client;
}

function isWorkflowNotFound(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("NOT_FOUND") || msg.includes("not found");
}

/** Admin variant — throws TemporalUnavailableError when Temporal is configured but down.
 *  Silently no-ops when the workflow handle is gone (admin-created orders have no workflow). */
export async function adminSignalMarkPaidManual(orderId: string): Promise<void> {
  const client = await getRequiredClient();
  if (!client) return;
  try {
    await client.workflow.getHandle(`order:${orderId}`).signal("markPaidManual", {});
  } catch (e) {
    if (!isWorkflowNotFound(e)) throw e;
  }
}

/** Admin variant — throws TemporalUnavailableError when Temporal is configured but down. */
export async function adminSignalCancelOrder(orderId: string): Promise<void> {
  const client = await getRequiredClient();
  if (!client) return;
  try {
    await client.workflow.getHandle(`order:${orderId}`).signal("cancelOrder", {});
  } catch (e) {
    if (!isWorkflowNotFound(e)) throw e;
  }
}

const QUEUE = "commerce";

export interface PlaceOrderWorkflowInput {
  orderId: string;
  paymentId: string;
  providerCode: string;
  providerKind: "automatic" | "manual";
}

export class TemporalUnavailableError extends Error {
  constructor() {
    super("Temporal is not configured (TEMPORAL_ADDRESS unset)");
    this.name = "TemporalUnavailableError";
  }
}

let clientPromise: Promise<
  import("@temporalio/client").Client | null
> | null = null;

async function getTemporalClient(): Promise<
  import("@temporalio/client").Client | null
> {
  const address = env.TEMPORAL_ADDRESS?.trim();
  if (!address) return null;
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const { Connection, Client } = await import("@temporalio/client");
        const connection = await Connection.connect({ address });
        return new Client({ connection, namespace: "default" });
      } catch (e) {
        logger.warn({ err: e }, "temporal client connect failed");
        clientPromise = null; // allow retry on next call
        return null;
      }
    })();
  }
  return clientPromise;
}

function workflowId(orderId: string): string {
  return `order:${orderId}`;
}

/**
 * Best-effort start at order placement. If Temporal is unset or down we log
 * and return — the API HTTP request still succeeds and the order remains in
 * `awaiting_payment`. Operators can replay by sending a signal later, which
 * will signalWithStart the workflow.
 */
export async function startPlaceOrderWorkflow(
  input: PlaceOrderWorkflowInput,
): Promise<void> {
  const client = await getTemporalClient();
  if (!client) return;
  try {
    await client.workflow.start("placeOrderWorkflow", {
      taskQueue: QUEUE,
      workflowId: workflowId(input.orderId),
      workflowIdReusePolicy: WorkflowIdReusePolicy.REJECT_DUPLICATE,
      args: [input],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("WorkflowExecutionAlreadyStarted") ||
      msg.includes("already started")
    ) {
      return;
    }
    throw e;
  }
}

interface SignalCommonInput extends PlaceOrderWorkflowInput {}

async function signalWithStartOrThrow(
  signalName: string,
  signalArgs: unknown[],
  input: SignalCommonInput,
): Promise<void> {
  const client = await getTemporalClient();
  if (!client) throw new TemporalUnavailableError();
  // signalWithStart races with start: if the workflow is already running, the
  // signal is delivered against the existing run; if not, the workflow is
  // started and the signal is buffered for it. This eliminates the
  // start-then-signal race that plain getHandle().signal() suffers from.
  // The cast is to `any[]` because we identify the workflow by string (cross-
  // service boundary), so TS can't infer the workflow's argument shape here.
  await client.workflow.signalWithStart("placeOrderWorkflow", {
    taskQueue: QUEUE,
    workflowId: workflowId(input.orderId),
    workflowIdReusePolicy: WorkflowIdReusePolicy.ALLOW_DUPLICATE,
    args: [input],
    signal: signalName,
    signalArgs: signalArgs as [unknown, ...unknown[]],
  });
}

export async function signalPaymentTransactionRecorded(
  input: SignalCommonInput,
): Promise<void> {
  await signalWithStartOrThrow(
    "paymentTransactionRecorded",
    [],
    input,
  );
}

export async function signalCancelPlaceOrder(
  input: SignalCommonInput,
  reason: "admin_cancelled" | "customer_cancelled" = "admin_cancelled",
): Promise<void> {
  await signalWithStartOrThrow("cancelOrder", [reason], input);
}

export async function signalMarkPaidManual(
  input: SignalCommonInput,
): Promise<void> {
  await signalWithStartOrThrow("markPaidManual", [], input);
}

export async function startGenerateInvoiceWorkflow(input: {
  orderId: string;
  paymentId: string;
}): Promise<boolean> {
  const client = await getTemporalClient();
  if (!client) return false;
  const wfId = `invoice-retry:${input.orderId}`;
  try {
    await client.workflow.start("generateInvoiceWorkflow", {
      taskQueue: QUEUE,
      workflowId: wfId,
      workflowIdReusePolicy:
        WorkflowIdReusePolicy.ALLOW_DUPLICATE_FAILED_ONLY,
      args: [input],
    });
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("WorkflowExecutionAlreadyStarted") ||
      msg.includes("already started")
    ) {
      return true;
    }
    logger.warn({ err: e, ...input }, "invoice retry workflow start failed");
    return false;
  }
}
