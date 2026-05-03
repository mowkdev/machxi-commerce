import type { Context } from "hono";
import type { AppEnv } from "../context";
import { notFound, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import {
  storeGetProductQuery,
  storeListCategoriesQuery,
  storeListProductsQuery,
  storeProductHandleParam,
} from "./schema";
import {
  getStoreProductByHandle,
  listStoreCategories,
  listStoreProducts,
} from "./service";

export async function listProductsController(c: Context<AppEnv>) {
  const parsed = storeListProductsQuery.safeParse(c.req.query());
  if (!parsed.success) {
    throw validationFailed("Invalid query", { issues: parsed.error.issues });
  }
  const result = await listStoreProducts(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getProductController(c: Context<AppEnv>) {
  const params = storeProductHandleParam.safeParse({
    handle: c.req.param("handle"),
  });
  if (!params.success) {
    throw validationFailed("Invalid product handle", {
      issues: params.error.issues,
    });
  }
  const query = storeGetProductQuery.safeParse(c.req.query());
  if (!query.success) {
    throw validationFailed("Invalid query", { issues: query.error.issues });
  }
  const product = await getStoreProductByHandle(
    params.data.handle,
    query.data.currency,
    query.data.language,
  );
  if (!product) throw notFound("Product not found");
  return ok(c, product);
}

export async function listCategoriesController(c: Context<AppEnv>) {
  const parsed = storeListCategoriesQuery.safeParse(c.req.query());
  if (!parsed.success) {
    throw validationFailed("Invalid query", { issues: parsed.error.issues });
  }
  const data = await listStoreCategories(parsed.data);
  return ok(c, data);
}
