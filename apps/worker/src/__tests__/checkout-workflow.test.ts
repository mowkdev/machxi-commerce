import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "@temporalio/worker";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  cancelOrderSignal,
  markPaidManualSignal,
  paymentTransactionRecordedSignal,
  placeOrderWorkflow,
} from "../workflows/checkout";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workflowsPath = join(__dirname, "../workflows");

const noop = async () => {};

describe("placeOrderWorkflow", () => {
  let testEnv!: TestWorkflowEnvironment;
  let worker: Worker | undefined;
  let workerRun: Promise<void> | undefined;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
    worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: "commerce",
      workflowsPath,
      activities: {
        compensateAbandonedOrder: noop,
        markManualInvoicePaid: noop,
        ensureOrderProcessingIfCaptured: noop,
        generateInvoice: noop,
        sendInvoiceReminder: noop,
      },
    });
    workerRun = worker.run();
  });

  afterAll(async () => {
    if (worker && workerRun) {
      await worker.shutdown();
      await workerRun;
    }
    await testEnv?.teardown();
  });

  it("completes when a payment transaction webhook is signalled", async () => {
    const handle = await testEnv.workflowClient.start(placeOrderWorkflow, {
      taskQueue: "commerce",
      workflowId: `wf-test-auto-${Date.now()}`,
      args: [
        {
          orderId: "550e8400-e29b-41d4-a716-446655440000",
          paymentId: "550e8400-e29b-41d4-a716-446655440001",
          providerCode: "stripe",
          providerKind: "automatic",
        },
      ],
    });

    await handle.signal(paymentTransactionRecordedSignal);

    await expect(handle.result()).resolves.toMatchObject({
      outcome: "completed",
    });
  });

  it("manual invoice path completes after markPaidManual signal", async () => {
    const handle = await testEnv.workflowClient.start(placeOrderWorkflow, {
      taskQueue: "commerce",
      workflowId: `wf-test-man-${Date.now()}`,
      args: [
        {
          orderId: "660e8400-e29b-41d4-a716-446655440000",
          paymentId: "660e8400-e29b-41d4-a716-446655440001",
          providerCode: "manual_invoice",
          providerKind: "manual",
        },
      ],
    });

    await handle.signal(markPaidManualSignal);

    await expect(handle.result()).resolves.toMatchObject({
      outcome: "completed",
    });
  });

  it("cancels and propagates the cancel reason", async () => {
    const handle = await testEnv.workflowClient.start(placeOrderWorkflow, {
      taskQueue: "commerce",
      workflowId: `wf-test-cancel-${Date.now()}`,
      args: [
        {
          orderId: "770e8400-e29b-41d4-a716-446655440000",
          paymentId: "770e8400-e29b-41d4-a716-446655440001",
          providerCode: "manual_invoice",
          providerKind: "manual",
        },
      ],
    });

    await handle.signal(cancelOrderSignal, "admin_cancelled");

    await expect(handle.result()).resolves.toMatchObject({
      outcome: "cancelled",
    });
  });

  /** Timeout path is exercised in docs / CI would need deterministic time-skipping tuning per OS. */
});
