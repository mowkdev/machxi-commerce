import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { authHandler, initAuthConfig } from "@hono/auth-js";
import { ERROR_CODES } from "@repo/types";
import type { AppEnv } from "./context";
import { env } from "./env";
import { AUTH_BASE_PATH, buildAuthConfig } from "./auth/config";
import { attachPrincipal } from "./auth/middleware";
import { healthRoutes } from "./health/routes";
import { mediaRoutes } from "./media/routes";
import { productsRoutes } from "./products/routes";
import { categoriesRoutes } from "./categories/routes";
import { languagesRoutes } from "./languages/routes";
import { taxClassesRoutes } from "./tax-classes/routes";
import { currenciesRoutes } from "./currencies/routes";
import { priceListsRoutes } from "./price-lists/routes";
import { promotionsRoutes } from "./promotions/routes";
import { stockLocationsRoutes } from "./stock-locations/routes";
import { inventoryRoutes } from "./inventory/routes";
import { shippingRoutes } from "./shipping/routes";
import { paymentProvidersRoutes } from "./payment-providers/routes";
import { customersRoutes } from "./customers/routes";
import { adminCartsRoutes } from "./admin-carts/routes";
import { ordersRoutes } from "./orders/routes";
import { fulfillmentsRoutes } from "./fulfillments/routes";
import { returnsRoutes } from "./returns/routes";
import { usersRoutes } from "./users/routes";
import { rolesRoutes } from "./roles/routes";
import { optionDefinitionsRoutes } from "./option-definitions/routes";
import { storeAuthRoutes } from "./store-auth/routes";
import { storeAddressesRoutes } from "./store-addresses/routes";
import { storeCatalogRoutes } from "./store-catalog/routes";
import { storeCartsRoutes } from "./store-carts/routes";
import { storeCheckoutRoutes } from "./store-checkout/routes";
import { storeCurrenciesRoutes } from "./store-currencies/routes";
import { storeOrdersRoutes } from "./store-orders/routes";
import { paymentWebhookRoutes } from "./payments/webhooks/routes";
import { storeSettingsRoutes } from "./store-settings/routes";
import { invoicesRoutes } from "./invoices/routes";
import { cmsRoutes } from "./cms/routes";
import { logger } from "./lib/logger";
import { requestLogger } from "./lib/requestLogger";
import { err, errFromException } from "./lib/response";
import { mountOpenAPI } from "./openapi/routes";

export function createApp() {
  const app = new Hono<AppEnv>();

  // Order matters: requestLogger must run first so every other middleware
  // (including errors) has access to the per-request child logger.
  app.use("*", requestLogger);
  app.use("*", secureHeaders());
  app.use(
    "*",
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  app.use(
    "*",
    initAuthConfig(() => buildAuthConfig()),
  );
  app.use(`${AUTH_BASE_PATH}/*`, authHandler());
  app.use("*", attachPrincipal);

  app.onError((e, c) => {
    const log = c.get("logger") ?? logger;
    log.error({ err: e }, "unhandled error in request");
    return errFromException(c, e);
  });

  app.notFound((c) =>
    err(c, { code: ERROR_CODES.NOT_FOUND, message: "Route not found" }, 404),
  );

  app.route("/health", healthRoutes);
  app.route("/api/products", productsRoutes);
  app.route("/api/categories", categoriesRoutes);
  app.route("/api/languages", languagesRoutes);
  app.route("/api/tax-classes", taxClassesRoutes);
  app.route("/api/currencies", currenciesRoutes);
  app.route("/api/price-lists", priceListsRoutes);
  app.route("/api/promotions", promotionsRoutes);
  app.route("/api/stock-locations", stockLocationsRoutes);
  app.route("/api/inventory", inventoryRoutes);
  app.route("/api/media", mediaRoutes);
  app.route("/api/shipping", shippingRoutes);
  app.route("/api/payment-providers", paymentProvidersRoutes);
  app.route("/api/customers", customersRoutes);
  app.route("/api/carts", adminCartsRoutes);
  app.route("/api/orders", ordersRoutes);
  app.route("/api/fulfillments", fulfillmentsRoutes);
  app.route("/api/returns", returnsRoutes);
  app.route("/api/users", usersRoutes);
  app.route("/api/roles", rolesRoutes);
  app.route("/api/options", optionDefinitionsRoutes);
  app.route("/api/store/auth", storeAuthRoutes);
  app.route("/api/store/addresses", storeAddressesRoutes);
  app.route("/api/store", storeCatalogRoutes);
  app.route("/api/store/carts", storeCartsRoutes);
  app.route("/api/store", storeCheckoutRoutes);
  app.route("/api/store/currencies", storeCurrenciesRoutes);
  app.route("/api/store/orders", storeOrdersRoutes);
  app.route("/api/store-settings", storeSettingsRoutes);
  app.route("/api/invoices", invoicesRoutes);
  app.route("/api/cms", cmsRoutes);
  app.route("/api/payments/webhooks", paymentWebhookRoutes);

  if (env.OPENAPI_DOCS_ENABLED) {
    // Mounted last so it can introspect every registered route.
    mountOpenAPI(app);
  }

  return app;
}
