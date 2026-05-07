import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { AppEnv } from "../context";
import { requireAdmin } from "../auth/middleware";
import {
  jsonRequestBody,
  jsonResponse,
  paginatedEnvelope,
  paramsFromSchema,
  standardErrorResponses,
  successEnvelope,
} from "../openapi/envelope";
import {
  createCurrencyBody,
  currencyCodeParam,
  currencyDetail,
  currencyListItem,
  listCurrenciesQuery,
  updateCurrencyBody,
} from "./schema";
import {
  createCurrencyController,
  getCurrencyController,
  listCurrenciesController,
  updateCurrencyController,
} from "./controller";

export const currenciesRoutes = new Hono<AppEnv>();

currenciesRoutes.use("*", requireAdmin);

const TAGS = ["currencies"];
const codeParameters = paramsFromSchema(currencyCodeParam, "path");

const createAck = z.object({ code: z.string() });

currenciesRoutes.get(
  "/",
  describeRoute({
    operationId: "adminListCurrencies",
    summary: "List currencies (active + inactive)",
    tags: TAGS,
    parameters: paramsFromSchema(listCurrenciesQuery, "query"),
    responses: {
      200: jsonResponse(
        "Page of currencies",
        paginatedEnvelope(currencyListItem),
      ),
      ...standardErrorResponses,
    },
  }),
  listCurrenciesController,
);

currenciesRoutes.post(
  "/",
  describeRoute({
    operationId: "adminCreateCurrency",
    summary: "Create a currency",
    tags: TAGS,
    requestBody: jsonRequestBody(createCurrencyBody),
    responses: {
      201: jsonResponse("Created currency code", successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createCurrencyController,
);

currenciesRoutes.get(
  "/:code",
  describeRoute({
    operationId: "adminGetCurrency",
    summary: "Get a currency",
    tags: TAGS,
    parameters: codeParameters,
    responses: {
      200: jsonResponse("Currency", successEnvelope(currencyDetail)),
      ...standardErrorResponses,
    },
  }),
  getCurrencyController,
);

currenciesRoutes.patch(
  "/:code",
  describeRoute({
    operationId: "adminUpdateCurrency",
    summary: "Update active/default/displayOrder flags on a currency",
    tags: TAGS,
    parameters: codeParameters,
    requestBody: jsonRequestBody(updateCurrencyBody),
    responses: {
      200: jsonResponse("Updated currency", successEnvelope(currencyDetail)),
      ...standardErrorResponses,
    },
  }),
  updateCurrencyController,
);
