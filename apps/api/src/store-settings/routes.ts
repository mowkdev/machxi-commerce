import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { storeSettingsDetail, updateStoreSettingsBody } from "@repo/types/admin";
import type { AppEnv } from "../context";
import { requireAdmin } from "../auth/middleware";
import {
  jsonRequestBody,
  jsonResponse,
  standardErrorResponses,
  successEnvelope,
} from "../openapi/envelope";
import {
  getStoreSettingsController,
  updateStoreSettingsController,
} from "./controller";

export const storeSettingsRoutes = new Hono<AppEnv>();

storeSettingsRoutes.use("*", requireAdmin);

const TAGS = ["store-settings"];

storeSettingsRoutes.get(
  "/",
  describeRoute({
    operationId: "adminGetStoreSettings",
    summary: "Get store settings",
    tags: TAGS,
    responses: {
      200: jsonResponse(
        "Store settings (null if not configured)",
        successEnvelope(storeSettingsDetail.nullable()),
      ),
      ...standardErrorResponses,
    },
  }),
  getStoreSettingsController,
);

storeSettingsRoutes.put(
  "/",
  describeRoute({
    operationId: "adminUpdateStoreSettings",
    summary: "Create or update store settings",
    tags: TAGS,
    requestBody: jsonRequestBody(updateStoreSettingsBody),
    responses: {
      200: jsonResponse(
        "Updated store settings",
        successEnvelope(storeSettingsDetail),
      ),
      ...standardErrorResponses,
    },
  }),
  updateStoreSettingsController,
);
