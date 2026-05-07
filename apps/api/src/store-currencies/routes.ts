import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import type { AppEnv } from "../context";
import {
  jsonResponse,
  standardErrorResponses,
  successEnvelope,
} from "../openapi/envelope";
import { storeCurrencies } from "@repo/types/storefront";
import { listStoreCurrenciesController } from "./controller";

export const storeCurrenciesRoutes = new Hono<AppEnv>();

const TAGS = ["store-currencies"];

storeCurrenciesRoutes.get(
  "/",
  describeRoute({
    operationId: "storeListCurrencies",
    summary: "List active currencies and the configured default",
    tags: TAGS,
    responses: {
      200: jsonResponse("Currencies", successEnvelope(storeCurrencies)),
      ...standardErrorResponses,
    },
  }),
  listStoreCurrenciesController,
);
