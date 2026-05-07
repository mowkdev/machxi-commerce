/** Payment-provider strategy (automatic = webhooks / manual = admin-facing). */

export type PaymentTransactionType = "authorize" | "capture" | "refund" | "void";
export type PaymentTransactionStatus = "pending" | "succeeded" | "failed";

export interface CreateSessionInput {
  paymentId: string;
  orderId: string;
  amount: number;
  currencyCode: string;
  idempotencyKey: string;
  /** Row from DB — never contains secrets */
  config: Record<string, unknown>;
  customer?: { customerId: string | null; email: string | null };
}

export interface CreateSessionResult {
  /** Provider session id (e.g. PaymentIntent.id); null for manual_invoice */
  remoteId: string | null;
  clientPayload: unknown;
}

export interface VoidOrRefundInput {
  remoteId: string;
  amount: number;
  currencyCode: string;
  idempotencyKey: string;
  config: Record<string, unknown>;
}

/** One ledger line derived from a webhook (idempotent insert by remoteId). */
export interface WebhookParsedTransaction {
  remoteId: string;
  type: PaymentTransactionType;
  status: PaymentTransactionStatus;
  amount: number;
  currencyCode: string;
}

export interface VerifyWebhookInput {
  rawBody: string | Buffer;
  headers: Record<string, string | string[] | undefined>;
  config: Record<string, unknown>;
}

export interface ParsedWebhook {
  /** Identifies the payment row (e.g. PaymentIntent id stored in payments.metadata) */
  sessionRemoteId: string;
  transactions: WebhookParsedTransaction[];
}

export interface PaymentProvider {
  readonly code: string;
  readonly kind: "automatic" | "manual";
  createSession(input: CreateSessionInput): Promise<CreateSessionResult>;
  /** Returns null if the event should be ignored (unrelated type). */
  verifyAndParseWebhook(input: VerifyWebhookInput): ParsedWebhook | null;
  voidOrRefund(input: VoidOrRefundInput): Promise<void>;
}
