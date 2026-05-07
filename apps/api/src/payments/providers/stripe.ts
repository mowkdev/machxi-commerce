import Stripe from "stripe";
import type {
  CreateSessionInput,
  CreateSessionResult,
  ParsedWebhook,
  PaymentProvider,
  VerifyWebhookInput,
  VoidOrRefundInput,
} from "./types";

function getStripeSecret(): string | undefined {
  return process.env.STRIPE_SECRET_KEY?.trim() || undefined;
}

function getWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined;
}

function stripeClient(): Stripe {
  const key = getStripeSecret();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key, { typescript: true });
}

function stripeCurrency(pi: Stripe.PaymentIntent): string {
  return (pi.currency ?? "usd").toUpperCase();
}

export const stripeProvider: PaymentProvider = {
  code: "stripe",
  kind: "automatic",

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    const stripe = stripeClient();
    const currency = input.currencyCode.toLowerCase();

    const intent = await stripe.paymentIntents.create(
      {
        amount: input.amount,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          orderId: input.orderId,
          paymentId: input.paymentId,
        },
      },
      { idempotencyKey: input.idempotencyKey },
    );

    const clientSecret = intent.client_secret;
    if (!clientSecret) {
      throw new Error("Stripe PaymentIntent missing client_secret");
    }

    return {
      remoteId: intent.id,
      clientPayload: {
        kind: "stripe" as const,
        publishableKey:
          typeof input.config.publishableKey === "string"
            ? input.config.publishableKey
            : undefined,
        clientSecret,
        paymentIntentId: intent.id,
      },
    };
  },

  verifyAndParseWebhook(input: VerifyWebhookInput): ParsedWebhook | null {
    const whSecret = getWebhookSecret();
    if (!whSecret && process.env.NODE_ENV === "production") {
      throw new Error("STRIPE_WEBHOOK_SECRET is required in production");
    }

    const sigHeader = input.headers["stripe-signature"];
    const signature =
      typeof sigHeader === "string"
        ? sigHeader
        : Array.isArray(sigHeader)
          ? sigHeader[0]
          : undefined;

    let event: Stripe.Event;
    if (whSecret && signature) {
      const stripe = stripeClient();
      event = stripe.webhooks.constructEvent(
        typeof input.rawBody === "string"
          ? Buffer.from(input.rawBody)
          : input.rawBody,
        signature,
        whSecret,
      );
    } else {
      event = JSON.parse(
        typeof input.rawBody === "string"
          ? input.rawBody
          : input.rawBody.toString("utf8"),
      ) as Stripe.Event;
    }

    if (
      event.type === "payment_intent.succeeded" &&
      event.data.object &&
      typeof event.data.object === "object"
    ) {
      const pi = event.data.object as Stripe.PaymentIntent;
      const id = pi.id;
      const amount = pi.amount_received ?? pi.amount ?? 0;
      return {
        sessionRemoteId: id,
        transactions: [
          {
            remoteId: `${id}:capture:succeeded`,
            type: "capture",
            status: "succeeded",
            amount,
            currencyCode: stripeCurrency(pi),
          },
        ],
      };
    }

    if (
      event.type === "payment_intent.payment_failed" &&
      event.data.object &&
      typeof event.data.object === "object"
    ) {
      const pi = event.data.object as Stripe.PaymentIntent;
      const id = pi.id;
      const amount = pi.amount ?? 0;
      return {
        sessionRemoteId: id,
        transactions: [
          {
            remoteId: `${id}:capture:failed`,
            type: "capture",
            status: "failed",
            amount,
            currencyCode: stripeCurrency(pi),
          },
        ],
      };
    }

    if (
      event.type === "charge.refunded" &&
      event.data.object &&
      typeof event.data.object === "object"
    ) {
      const ch = event.data.object as Stripe.Charge;
      const piId =
        typeof ch.payment_intent === "string"
          ? ch.payment_intent
          : ch.payment_intent && typeof ch.payment_intent !== "string"
            ? ch.payment_intent.id
            : null;
      if (!piId) return null;
      const amount = ch.amount_refunded ?? 0;
      const cur =
        typeof ch.currency === "string" ? ch.currency.toUpperCase() : "USD";
      return {
        sessionRemoteId: piId,
        transactions: [
          {
            remoteId: `${ch.id}:refund:succeeded`,
            type: "refund",
            status: "succeeded",
            amount,
            currencyCode: cur,
          },
        ],
      };
    }

    return null;
  },

  async voidOrRefund(input: VoidOrRefundInput): Promise<void> {
    const stripe = stripeClient();
    const pi = await stripe.paymentIntents.retrieve(input.remoteId);
    if (
      pi.status === "requires_capture" ||
      pi.status === "requires_confirmation" ||
      pi.status === "requires_payment_method"
    ) {
      await stripe.paymentIntents.cancel(
        input.remoteId,
        {},
        { idempotencyKey: input.idempotencyKey },
      );
      return;
    }
    if (pi.status === "succeeded") {
      const chargeId =
        typeof pi.latest_charge === "string"
          ? pi.latest_charge
          : pi.latest_charge?.id;
      if (!chargeId) return;
      await stripe.refunds.create(
        {
          charge: chargeId,
          amount: input.amount > 0 ? input.amount : undefined,
        },
        { idempotencyKey: input.idempotencyKey },
      );
    }
  },
};

export function stripeSecretConfigured(): boolean {
  return !!getStripeSecret();
}
