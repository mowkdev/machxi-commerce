import { log, proxyActivities } from "@temporalio/workflow";

type InvoiceActivities = {
  generateInvoice: (input: {
    orderId: string;
    paymentId: string;
  }) => Promise<void>;
};

const a = proxyActivities<InvoiceActivities>({
  startToCloseTimeout: "2 minutes",
  retry: {
    maximumAttempts: 5,
    initialInterval: "2s",
    backoffCoefficient: 2,
    maximumInterval: "30s",
  },
});

export interface GenerateInvoiceInput {
  orderId: string;
  paymentId: string;
}

export async function generateInvoiceWorkflow(
  input: GenerateInvoiceInput,
): Promise<{ outcome: string }> {
  await a.generateInvoice({
    orderId: input.orderId,
    paymentId: input.paymentId,
  });
  log.info("Invoice generated via retry workflow", {
    orderId: input.orderId,
  });
  return { outcome: "invoice_generated" };
}
