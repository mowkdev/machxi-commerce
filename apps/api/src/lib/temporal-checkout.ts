/**
 * Temporal integration for checkout workflows. No-ops when TEMPORAL_ADDRESS is unset.
 */

import { WorkflowIdReusePolicy } from "@temporalio/common";
import { env } from "../env";
import { logger } from "./logger";

const QUEUE = "commerce";

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
        return null;
      }
    })();
  }
  return clientPromise;
}

export async function startPlaceOrderWorkflow(input: {
  orderId: string;
  paymentId: string;
  providerCode: string;
  providerKind: "automatic" | "manual";
}): Promise<void> {
  const client = await getTemporalClient();
  if (!client) return;
  const workflowId = `order:${input.orderId}`;
  try {
    await client.workflow.start("placeOrderWorkflow", {
      taskQueue: QUEUE,
      workflowId,
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

export async function signalPaymentTransactionRecorded(input: {
  orderId: string;
  paymentId: string;
}): Promise<void> {
  const client = await getTemporalClient();
  if (!client) return;
  const handle = client.workflow.getHandle(`order:${input.orderId}`);
  try {
    await handle.signal("paymentTransactionRecorded");
  } catch (e) {
    logger.warn({ err: e, ...input }, "temporal signal failed");
  }
}

export async function signalCancelPlaceOrder(orderId: string): Promise<void> {
  const client = await getTemporalClient();
  if (!client) return;
  try {
    const handle = client.workflow.getHandle(`order:${orderId}`);
    await handle.signal("cancelOrder", {});
  } catch (e) {
    logger.warn({ err: e, orderId }, "temporal cancelOrder signal failed");
  }
}

export async function signalMarkPaidManual(orderId: string): Promise<void> {
  const client = await getTemporalClient();
  if (!client) return;
  try {
    const handle = client.workflow.getHandle(`order:${orderId}`);
    await handle.signal("markPaidManual", {});
  } catch (e) {
    logger.warn({ err: e, orderId }, "temporal markPaidManual signal failed");
  }
}

export async function startGenerateInvoiceWorkflow(input: {
  orderId: string;
  paymentId: string;
}): Promise<boolean> {
  const client = await getTemporalClient();
  if (!client) return false;
  const workflowId = `invoice-retry:${input.orderId}`;
  try {
    await client.workflow.start("generateInvoiceWorkflow", {
      taskQueue: QUEUE,
      workflowId,
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
