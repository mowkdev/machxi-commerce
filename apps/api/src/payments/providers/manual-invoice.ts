import type {
  CreateSessionInput,
  CreateSessionResult,
  PaymentProvider,
  VerifyWebhookInput,
  VoidOrRefundInput,
} from "./types";

export const manualInvoiceProvider: PaymentProvider = {
  code: "manual_invoice",
  kind: "manual",
  meta: {
    displayName: "Manual Invoice",
    publicConfigKeys: ["termsUrl", "instructions"],
    requiredEnvVars: [],
  },

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    const terms =
      typeof input.config.termsUrl === "string"
        ? input.config.termsUrl
        : typeof input.config.instructions === "string"
          ? input.config.instructions
          : "We will send you an invoice shortly. Your order is awaiting payment.";

    return {
      remoteId: null,
      clientPayload: {
        kind: "manual_invoice" as const,
        terms,
      },
    };
  },

  verifyAndParseWebhook(_input: VerifyWebhookInput): null {
    return null;
  },

  async voidOrRefund(_input: VoidOrRefundInput): Promise<void> {
    // Manual payments are reconciled in admin; nothing to void at a PSP.
  },
};
