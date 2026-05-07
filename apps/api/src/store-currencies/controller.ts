import type { Context } from "hono";
import type { AppEnv } from "../context";
import { ok } from "../lib/response";
import { listStoreCurrencies } from "./service";

export async function listStoreCurrenciesController(c: Context<AppEnv>) {
  const result = await listStoreCurrencies();
  return ok(c, result);
}
