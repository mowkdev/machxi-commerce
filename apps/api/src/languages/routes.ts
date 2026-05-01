import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import {
  createLanguageBody,
  languageDetail,
  languageListItem,
  updateLanguageBody,
} from "@repo/types/admin";
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
  createLanguageController,
  deleteLanguageController,
  getLanguageController,
  listLanguagesController,
  updateLanguageController,
} from "./controller";
import { languageCodeParam, listLanguagesQuery } from "./schema";

export const languagesRoutes = new Hono<AppEnv>();

languagesRoutes.use("*", requireAdmin);

const TAGS = ["languages"];
const codeParameters = paramsFromSchema(languageCodeParam, "path");

const createAck = z.object({ code: z.string() });
const deleteAck = z.object({
  code: z.string(),
  deleted: z.literal(true),
});

languagesRoutes.get(
  "/",
  describeRoute({
    operationId: "adminListLanguages",
    summary: "List languages",
    tags: TAGS,
    parameters: paramsFromSchema(listLanguagesQuery, "query"),
    responses: {
      200: jsonResponse(
        "Page of languages",
        paginatedEnvelope(languageListItem),
      ),
      ...standardErrorResponses,
    },
  }),
  listLanguagesController,
);

languagesRoutes.post(
  "/",
  describeRoute({
    operationId: "adminCreateLanguage",
    summary: "Create a language",
    tags: TAGS,
    requestBody: jsonRequestBody(createLanguageBody),
    responses: {
      201: jsonResponse("Created language code", successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createLanguageController,
);

languagesRoutes.get(
  "/:code",
  describeRoute({
    operationId: "adminGetLanguage",
    summary: "Get a language",
    tags: TAGS,
    parameters: codeParameters,
    responses: {
      200: jsonResponse("Language detail", successEnvelope(languageDetail)),
      ...standardErrorResponses,
    },
  }),
  getLanguageController,
);

languagesRoutes.put(
  "/:code",
  describeRoute({
    operationId: "adminUpdateLanguage",
    summary: "Update a language",
    tags: TAGS,
    parameters: codeParameters,
    requestBody: jsonRequestBody(updateLanguageBody),
    responses: {
      200: jsonResponse("Updated language", successEnvelope(languageDetail)),
      ...standardErrorResponses,
    },
  }),
  updateLanguageController,
);

languagesRoutes.delete(
  "/:code",
  describeRoute({
    operationId: "adminDeleteLanguage",
    summary: "Delete a language",
    tags: TAGS,
    parameters: codeParameters,
    responses: {
      200: jsonResponse("Language deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteLanguageController,
);
