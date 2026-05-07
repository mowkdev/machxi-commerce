import { Hono } from "hono";
import type { AppEnv } from "../../context";
import { processPaymentProviderWebhook } from "./service";
import { validationFailed } from "../../lib/errors";
import { errFromException } from "../../lib/response";

export const paymentWebhookRoutes = new Hono<AppEnv>();

paymentWebhookRoutes.post("/:code", async (c) => {
  const code = c.req.param("code");
  let rawBody: string;
  try {
    rawBody = await c.req.text();
  } catch {
    return errFromException(c, validationFailed("Empty body"));
  }
  try {
    await processPaymentProviderWebhook({
      code,
      rawBody,
      headers: Object.fromEntries(c.req.raw.headers.entries()),
    });
    return c.body(null, 200);
  } catch (e) {
    return errFromException(c, e);
  }
});
