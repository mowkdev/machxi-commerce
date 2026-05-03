import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { AppEnv } from "../context";
import {
  jsonResponse,
  paginatedEnvelope,
  paramsFromSchema,
  standardErrorResponses,
  successEnvelope,
} from "../openapi/envelope";
import {
  getProductController,
  listCategoriesController,
  listProductsController,
} from "./controller";
import {
  storeCategory,
  storeGetProductQuery,
  storeListCategoriesQuery,
  storeListProductsQuery,
  storeProductDetail,
  storeProductHandleParam,
  storeProductListItem,
} from "./schema";

export const storeCatalogRoutes = new Hono<AppEnv>();

const TAGS_PRODUCTS = ["store-products"];
const TAGS_CATEGORIES = ["store-categories"];

storeCatalogRoutes.get(
  "/products",
  describeRoute({
    operationId: "storeListProducts",
    summary: "List published products",
    tags: TAGS_PRODUCTS,
    parameters: paramsFromSchema(storeListProductsQuery, "query"),
    responses: {
      200: jsonResponse(
        "Page of products",
        paginatedEnvelope(storeProductListItem),
      ),
      ...standardErrorResponses,
    },
  }),
  listProductsController,
);

storeCatalogRoutes.get(
  "/products/:handle",
  describeRoute({
    operationId: "storeGetProductByHandle",
    summary: "Get a product by handle",
    tags: TAGS_PRODUCTS,
    parameters: [
      ...(paramsFromSchema(storeProductHandleParam, "path") ?? []),
      ...(paramsFromSchema(storeGetProductQuery, "query") ?? []),
    ],
    responses: {
      200: jsonResponse("Product detail", successEnvelope(storeProductDetail)),
      ...standardErrorResponses,
    },
  }),
  getProductController,
);

storeCatalogRoutes.get(
  "/categories",
  describeRoute({
    operationId: "storeListCategories",
    summary: "List active categories",
    tags: TAGS_CATEGORIES,
    parameters: paramsFromSchema(storeListCategoriesQuery, "query"),
    responses: {
      200: jsonResponse(
        "Categories",
        successEnvelope(z.array(storeCategory)),
      ),
      ...standardErrorResponses,
    },
  }),
  listCategoriesController,
);
