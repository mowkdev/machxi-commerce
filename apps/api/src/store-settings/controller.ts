import type { Context } from "hono";
import type { AppEnv } from "../context";
import { validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { updateStoreSettingsBody } from "@repo/types/admin";
import { getStoreSettings, upsertStoreSettings } from "./service";

export async function getStoreSettingsController(c: Context<AppEnv>) {
  const settings = await getStoreSettings();
  return ok(c, settings);
}

export async function updateStoreSettingsController(c: Context<AppEnv>) {
  let bodyJson: unknown;
  try {
    bodyJson = await c.req.json();
  } catch {
    throw validationFailed("Invalid JSON body");
  }
  const parsed = updateStoreSettingsBody.safeParse(bodyJson);
  if (!parsed.success) {
    throw validationFailed("Invalid body", { issues: parsed.error.issues });
  }
  const settings = await upsertStoreSettings(parsed.data);
  return ok(c, settings);
}
