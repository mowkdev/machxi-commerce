// Storefront catalog service.
//
// Surface a *projection* of the admin-owned product catalog, scoped to:
//   - status='published' or 'archived' (drafts/deleted are hidden)
//   - one resolved language (caller's choice or store default)
//   - one resolved currency (caller-supplied)
//
// Pricing resolution is delegated to `store-pricing/service.ts` so the cart
// can reuse it for line-item totals.

import { db } from "@repo/database/client";
import {
  and,
  asc,
  eq,
  exists,
  ilike,
  inArray,
  isNotNull,
  ne,
  or,
  sql,
} from "@repo/database";
import {
  categories,
  categoryTranslations,
  inventoryItems,
  inventoryLevels,
  languages,
  media,
  productCategories,
  productMedia,
  productTranslations,
  productVariants,
  products,
  reservations,
  variantMedia,
  variantOptionValues,
} from "@repo/database/schema";
import type { PaginationMeta } from "@repo/types";
import type {
  StoreCategory,
  StoreListCategoriesQuery,
  StoreListProductsQuery,
  StoreMedia,
  StoreProductDetail,
  StoreProductListItem,
  StoreVariant,
} from "./schema";
import { resolveVariantPrices } from "../store-pricing/service";

const STORE_VISIBLE_STATUSES = ["published", "archived"] as const;
type StoreStatus = (typeof STORE_VISIBLE_STATUSES)[number];

async function defaultLanguageCode(): Promise<string> {
  const [row] = await db
    .select({ code: languages.code })
    .from(languages)
    .where(eq(languages.isDefault, true))
    .limit(1);
  if (!row) {
    throw new Error("No default language configured");
  }
  return row.code;
}

async function resolveLanguage(requested?: string): Promise<string> {
  if (requested) return requested;
  return defaultLanguageCode();
}

function toMedia(row: {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  altText: string | null;
  mimeType: string;
}): StoreMedia {
  return {
    id: row.id,
    url: row.url,
    thumbnailUrl: row.thumbnailUrl,
    altText: row.altText,
    mimeType: row.mimeType,
  };
}

// ── List ────────────────────────────────────────────────────────────────────

export async function listStoreProducts(
  query: StoreListProductsQuery,
): Promise<{ data: StoreProductListItem[]; meta: PaginationMeta }> {
  const language = await resolveLanguage(query.language);
  const offset = (query.page - 1) * query.pageSize;
  const searchPattern = query.search ? `%${query.search}%` : undefined;

  const filters = and(
    inArray(products.status, [...STORE_VISIBLE_STATUSES]),
    searchPattern
      ? or(
          ilike(products.baseSku, searchPattern),
          ilike(productTranslations.name, searchPattern),
          ilike(productTranslations.description, searchPattern),
        )
      : undefined,
    query.categoryHandle
      ? exists(
          db
            .select({ one: sql<number>`1` })
            .from(productCategories)
            .innerJoin(
              categoryTranslations,
              and(
                eq(categoryTranslations.categoryId, productCategories.categoryId),
                eq(categoryTranslations.languageCode, language),
                eq(categoryTranslations.handle, query.categoryHandle),
              ),
            )
            .where(eq(productCategories.productId, products.id)),
        )
      : undefined,
  );

  const rows = await db
    .select({
      id: products.id,
      status: products.status,
      createdAt: products.createdAt,
      handle: productTranslations.handle,
      name: productTranslations.name,
      description: productTranslations.description,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(products)
    .innerJoin(
      productTranslations,
      and(
        eq(productTranslations.productId, products.id),
        eq(productTranslations.languageCode, language),
      ),
    )
    .where(filters)
    .orderBy(asc(productTranslations.name), asc(products.id))
    .limit(query.pageSize)
    .offset(offset);

  const productIds = rows.map((r) => r.id);
  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages =
    totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

  if (productIds.length === 0) {
    return {
      data: [],
      meta: { page: query.page, pageSize: query.pageSize, totalPages, totalItems },
    };
  }

  // Variants for these products (limit to live ones).
  const variantRows = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
    })
    .from(productVariants)
    .where(
      and(
        inArray(productVariants.productId, productIds),
        ne(productVariants.status, "deleted"),
      ),
    );

  const variantsByProduct = new Map<string, string[]>();
  for (const row of variantRows) {
    const arr = variantsByProduct.get(row.productId) ?? [];
    arr.push(row.id);
    variantsByProduct.set(row.productId, arr);
  }

  const priceMap = await resolveVariantPrices(
    variantRows.map((r) => r.id),
    query.currency,
  );

  // Primary thumbnail per product = lowest-rank productMedia row.
  const thumbRows = await db
    .select({
      productId: productMedia.productId,
      rank: productMedia.rank,
      mediaId: media.id,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      altText: media.altText,
      mimeType: media.mimeType,
    })
    .from(productMedia)
    .innerJoin(media, eq(media.id, productMedia.mediaId))
    .where(inArray(productMedia.productId, productIds))
    .orderBy(asc(productMedia.rank));

  const thumbByProduct = new Map<string, StoreMedia>();
  for (const row of thumbRows) {
    if (thumbByProduct.has(row.productId)) continue;
    thumbByProduct.set(row.productId, {
      id: row.mediaId,
      url: row.url,
      thumbnailUrl: row.thumbnailUrl,
      altText: row.altText,
      mimeType: row.mimeType,
    });
  }

  const data: StoreProductListItem[] = rows.map((row) => {
    const variantIds = variantsByProduct.get(row.id) ?? [];
    const amounts = variantIds
      .map((id) => priceMap.get(id)?.amount)
      .filter((amount): amount is number => typeof amount === "number");

    const priceRange =
      amounts.length > 0
        ? {
            currencyCode: query.currency,
            minAmount: Math.min(...amounts),
            maxAmount: Math.max(...amounts),
          }
        : null;

    return {
      id: row.id,
      handle: row.handle,
      name: row.name,
      description: row.description,
      status: row.status as StoreStatus,
      thumbnail: thumbByProduct.get(row.id) ?? null,
      priceRange,
      createdAt: row.createdAt,
    };
  });

  return {
    data,
    meta: { page: query.page, pageSize: query.pageSize, totalPages, totalItems },
  };
}

// ── Detail ──────────────────────────────────────────────────────────────────

async function loadAvailableQuantities(
  variantIds: string[],
): Promise<Map<string, number>> {
  if (variantIds.length === 0) return new Map();

  // Variant → inventoryItem (variants without one have unlimited stock today).
  const variantRows = await db
    .select({
      variantId: productVariants.id,
      inventoryItemId: productVariants.inventoryItemId,
    })
    .from(productVariants)
    .where(inArray(productVariants.id, variantIds));

  const result = new Map<string, number>();
  const inventoryItemIds = variantRows
    .map((r) => r.inventoryItemId)
    .filter((id): id is string => id !== null);

  if (inventoryItemIds.length === 0) {
    for (const v of variantRows) result.set(v.variantId, Number.MAX_SAFE_INTEGER);
    return result;
  }

  const stockedRows = await db
    .select({
      inventoryItemId: inventoryLevels.inventoryItemId,
      stocked: sql<number>`coalesce(sum(${inventoryLevels.stockedQuantity}), 0)`.mapWith(
        Number,
      ),
    })
    .from(inventoryLevels)
    .where(inArray(inventoryLevels.inventoryItemId, inventoryItemIds))
    .groupBy(inventoryLevels.inventoryItemId);

  const reservedRows = await db
    .select({
      inventoryItemId: reservations.inventoryItemId,
      reserved: sql<number>`coalesce(sum(${reservations.quantity}), 0)`.mapWith(
        Number,
      ),
    })
    .from(reservations)
    .where(
      and(
        inArray(reservations.inventoryItemId, inventoryItemIds),
        sql`${reservations.expiresAt} > now()`,
      ),
    )
    .groupBy(reservations.inventoryItemId);

  const stockedMap = new Map(stockedRows.map((r) => [r.inventoryItemId, r.stocked]));
  const reservedMap = new Map(
    reservedRows.map((r) => [r.inventoryItemId, r.reserved]),
  );

  for (const v of variantRows) {
    if (!v.inventoryItemId) {
      result.set(v.variantId, Number.MAX_SAFE_INTEGER);
      continue;
    }
    const stocked = stockedMap.get(v.inventoryItemId) ?? 0;
    const reserved = reservedMap.get(v.inventoryItemId) ?? 0;
    result.set(v.variantId, Math.max(0, stocked - reserved));
  }
  return result;
}

export async function getStoreProductByHandle(
  handle: string,
  currencyCode: string,
  languageOverride?: string,
): Promise<StoreProductDetail | null> {
  const language = await resolveLanguage(languageOverride);

  const [row] = await db
    .select({
      id: products.id,
      status: products.status,
      type: products.type,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      handle: productTranslations.handle,
      name: productTranslations.name,
      description: productTranslations.description,
    })
    .from(products)
    .innerJoin(
      productTranslations,
      and(
        eq(productTranslations.productId, products.id),
        eq(productTranslations.languageCode, language),
        eq(productTranslations.handle, handle),
      ),
    )
    .where(inArray(products.status, [...STORE_VISIBLE_STATUSES]))
    .limit(1);

  if (!row) return null;

  const result = await db.query.products.findFirst({
    where: eq(products.id, row.id),
    with: {
      options: {
        with: {
          option: { with: { translations: true } },
          values: {
            with: {
              optionValue: { with: { translations: true } },
            },
          },
        },
      },
      variants: {
        where: ne(productVariants.status, "deleted"),
        with: {
          optionValues: true,
          media: {
            with: { media: true },
            orderBy: asc(variantMedia.rank),
          },
        },
      },
      media: {
        with: { media: true },
        orderBy: asc(productMedia.rank),
      },
      categories: {
        with: { category: { with: { translations: true } } },
      },
    },
  });

  if (!result) return null;

  const variantIds = result.variants.map((v) => v.id);
  const [priceMap, availableMap] = await Promise.all([
    resolveVariantPrices(variantIds, currencyCode),
    loadAvailableQuantities(variantIds),
  ]);

  const options = result.options.map((o) => ({
    id: o.id,
    code: o.option.code,
    name:
      o.option.translations.find((t) => t.languageCode === language)?.name ??
      o.option.translations[0]?.name ??
      o.option.code,
    rank: o.rank,
    values: o.values.map((v) => ({
      id: v.id,
      code: v.optionValue.code,
      label:
        v.optionValue.translations.find((t) => t.languageCode === language)
          ?.label ??
        v.optionValue.translations[0]?.label ??
        v.optionValue.code,
    })),
  }));

  const variants: StoreVariant[] = result.variants.map((v) => {
    const price = priceMap.get(v.id) ?? null;
    const available = availableMap.get(v.id) ?? 0;
    return {
      id: v.id,
      sku: v.sku,
      weight: v.weight,
      barcode: v.barcode,
      optionValueIds: v.optionValues.map((ov) => ov.valueId),
      price: price
        ? {
            currencyCode: currencyCode,
            amount: price.amount,
            compareAtAmount: price.compareAtAmount,
            taxInclusive: price.taxInclusive,
            source: price.source,
          }
        : null,
      inStock: available > 0,
      availableQuantity: available,
      media: v.media.map((m) => toMedia(m.media)),
    };
  });

  const productMediaList = result.media.map((m) => toMedia(m.media));

  const productCategoryRefs = result.categories
    .map((c) => {
      const t =
        c.category.translations.find((tt) => tt.languageCode === language) ??
        c.category.translations[0];
      if (!t) return null;
      return {
        id: c.category.id,
        handle: t.handle,
        name: t.name,
      };
    })
    .filter((c): c is { id: string; handle: string; name: string } => c !== null);

  return {
    id: result.id,
    handle: row.handle,
    name: row.name,
    description: row.description,
    status: row.status as StoreStatus,
    type: result.type as "simple" | "variable",
    options,
    variants,
    media: productMediaList,
    categories: productCategoryRefs,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Categories ──────────────────────────────────────────────────────────────

export async function listStoreCategories(
  query: StoreListCategoriesQuery,
): Promise<StoreCategory[]> {
  const language = await resolveLanguage(query.language);

  const rows = await db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      rank: categories.rank,
      handle: categoryTranslations.handle,
      name: categoryTranslations.name,
      description: categoryTranslations.description,
    })
    .from(categories)
    .innerJoin(
      categoryTranslations,
      and(
        eq(categoryTranslations.categoryId, categories.id),
        eq(categoryTranslations.languageCode, language),
      ),
    )
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.rank), asc(categoryTranslations.name));

  return rows.map((r) => ({
    id: r.id,
    parentId: r.parentId,
    rank: r.rank,
    handle: r.handle,
    name: r.name,
    description: r.description,
  }));
}

// Re-export so cart can pull a single variant's product info if needed.
export { resolveVariantPrice, resolveVariantPrices } from "../store-pricing/service";

void inventoryItems;
void variantOptionValues;
void isNotNull;
