import { db } from "@repo/database/client";
import { eq, sql } from "@repo/database";
import { paymentProviders, payments } from "@repo/database/schema";
import { notFound, validationFailed } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { applyWebhookTransactions } from "../payment-ledger";
import { getBuiltInPaymentProvider } from "../providers/registry";

export async function processPaymentProviderWebhook(opts: {
  code: string;
  rawBody: string;
  headers: Record<string, string | string[] | undefined>;
}): Promise<void> {
  const codeNorm = opts.code.trim().toLowerCase();

  const [providerRow] = await db
    .select()
    .from(paymentProviders)
    .where(eq(paymentProviders.code, codeNorm))
    .limit(1);
  if (!providerRow?.isEnabled) {
    throw notFound("Payment provider not found");
  }

  const builtIn = getBuiltInPaymentProvider(providerRow.code);
  if (!builtIn || builtIn.kind !== "automatic") {
    throw validationFailed("Webhooks not supported for this provider");
  }

  const cfg =
    providerRow.config && typeof providerRow.config === "object"
      ? (providerRow.config as Record<string, unknown>)
      : {};

  let parsed;
  try {
    parsed = builtIn.verifyAndParseWebhook({
      rawBody: opts.rawBody,
      headers: opts.headers,
      config: cfg,
    });
  } catch (e) {
    logger.warn({ err: e, code: codeNorm }, "webhook verification failed");
    throw validationFailed("Invalid webhook signature or payload");
  }

  if (!parsed) {
    return;
  }

  const [pay] = await db
    .select()
    .from(payments)
    .where(
      sql`coalesce(${payments.metadata}->>'paymentIntentId','') = ${parsed.sessionRemoteId}`,
    )
    .limit(1);

  if (!pay) {
    logger.warn(
      { sessionRemoteId: parsed.sessionRemoteId },
      "webhook: payment not found for session",
    );
    return;
  }

  if (pay.providerId.toLowerCase() !== codeNorm) {
    throw validationFailed("Provider mismatch");
  }

  await db.transaction(async (tx) => {
    await applyWebhookTransactions(tx, {
      paymentId: pay.id,
      currencyCode: pay.currencyCode,
      txs: parsed.transactions.map((t) => ({
        ...t,
        currencyCode: t.currencyCode.toUpperCase(),
      })),
    });
  });

  try {
    const { signalPaymentTransactionRecorded } = await import(
      "../../lib/temporal-checkout"
    );
    await signalPaymentTransactionRecorded({
      orderId: pay.orderId,
      paymentId: pay.id,
    });
  } catch (e) {
    logger.warn({ err: e }, "temporal signal skipped or failed");
  }
}
