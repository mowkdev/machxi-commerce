import { db } from '@repo/database/client';
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  ne,
  or,
  sql,
} from '@repo/database';
import {
  languages,
  products,
  productTranslations,
  productOptions,
  productOptionTranslations,
  productOptionValues,
  productOptionValueTranslations,
  productVariants,
  variantOptionValues,
  productCategories,
  priceSets,
  prices,
  inventoryItems,
  productMedia,
} from '@repo/database/schema';
import type { PaginationMeta } from '@repo/types';
import type {
  CreateProductBody,
  UpdateProductBody,
  UpdateVariantBody,
  GenerateVariantsBody,
  ProductDetailResponse,
} from '@repo/types/admin';
import type { ListProductsQuery, ProductListRow } from './schema';

// ── Helpers ─────────────────────────────────────────────────────────────────

const SORT_COLUMNS = {
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
  baseSku: products.baseSku,
  status: products.status,
} as const;

async function getDefaultLanguageCode(): Promise<string | undefined> {
  const row = await db
    .select({ code: languages.code })
    .from(languages)
    .where(eq(languages.isDefault, true))
    .limit(1);
  return row[0]?.code;
}

// ── List Products ───────────────────────────────────────────────────────────

export async function listProducts(
  query: ListProductsQuery
): Promise<{ data: ProductListRow[]; meta: PaginationMeta }> {
  const defaultLang = await getDefaultLanguageCode();

  const searchPattern = query.search ? `%${query.search}%` : undefined;

  const filters = and(
    ne(products.status, 'deleted'),
    query.status ? eq(products.status, query.status) : undefined,
    searchPattern
      ? or(
          ilike(products.baseSku, searchPattern),
          ilike(productTranslations.name, searchPattern)
        )
      : undefined
  );

  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: products.id,
      baseSku: products.baseSku,
      status: products.status,
      type: products.type,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      name: productTranslations.name,
      handle: productTranslations.handle,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(products)
    .leftJoin(
      productTranslations,
      defaultLang
        ? and(
            eq(productTranslations.productId, products.id),
            eq(productTranslations.languageCode, defaultLang)
          )
        : sql`false`
    )
    .where(filters)
    .orderBy(orderBy, asc(products.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

  const data: ProductListRow[] = rows.map(
    ({ totalCount: _totalCount, ...rest }) => rest
  );

  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      totalItems,
    },
  };
}

// ── Get Product Detail ──────────────────────────────────────────────────────

export async function getProduct(id: string): Promise<ProductDetailResponse | null> {
  const result = await db.query.products.findFirst({
    where: and(eq(products.id, id), ne(products.status, 'deleted')),
    with: {
      translations: true,
      options: {
        with: {
          translations: true,
          values: {
            with: { translations: true },
          },
        },
      },
      variants: {
        where: ne(productVariants.status, 'deleted'),
        with: {
          optionValues: {
            with: {
              value: {
                with: { translations: true },
              },
            },
          },
          priceSet: {
            with: { prices: true },
          },
          inventoryItem: {
            with: { levels: true },
          },
          media: {
            with: { media: true },
          },
        },
      },
      media: {
        with: { media: true },
        orderBy: asc(productMedia.rank),
      },
      categories: {
        with: {
          category: {
            with: { translations: true },
          },
        },
      },
    },
  });

  if (!result) return null;

  return {
    id: result.id,
    baseSku: result.baseSku,
    status: result.status,
    type: result.type,
    taxClassId: result.taxClassId,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    translations: result.translations.map((t) => ({
      id: t.id,
      languageCode: t.languageCode,
      name: t.name,
      description: t.description,
      handle: t.handle,
    })),
    options: result.options.map((o) => ({
      id: o.id,
      translations: o.translations.map((t) => ({
        id: t.id,
        languageCode: t.languageCode,
        name: t.name,
      })),
      values: o.values.map((v) => ({
        id: v.id,
        translations: v.translations.map((t) => ({
          id: t.id,
          languageCode: t.languageCode,
          label: t.label,
        })),
      })),
    })),
    variants: result.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      status: v.status,
      weight: v.weight,
      barcode: v.barcode,
      priceSetId: v.priceSetId,
      inventoryItemId: v.inventoryItemId,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      optionValues: v.optionValues.map((ov) => ({
        valueId: ov.valueId,
        value: {
          id: ov.value.id,
          optionId: ov.value.optionId,
          translations: ov.value.translations.map((t) => ({
            id: t.id,
            languageCode: t.languageCode,
            label: t.label,
          })),
        },
      })),
      prices: v.priceSet.prices.map((p) => ({
        id: p.id,
        currencyCode: p.currencyCode,
        amount: p.amount,
        compareAtAmount: p.compareAtAmount,
        minQuantity: p.minQuantity,
        taxInclusive: p.taxInclusive,
      })),
      inventoryLevels: v.inventoryItem?.levels.map((l) => ({
        locationId: l.locationId,
        stockedQuantity: l.stockedQuantity,
      })) ?? [],
      media: v.media.map((m) => ({
        mediaId: m.mediaId,
        rank: m.rank,
        media: {
          id: m.media.id,
          url: m.media.url,
          fileType: m.media.fileType,
          metadata: m.media.metadata,
        },
      })),
    })),
    media: result.media.map((m) => ({
      mediaId: m.mediaId,
      rank: m.rank,
      media: {
        id: m.media.id,
        url: m.media.url,
        fileType: m.media.fileType,
        metadata: m.media.metadata,
      },
    })),
    categories: result.categories.map((c) => ({
      categoryId: c.categoryId,
      category: {
        id: c.category.id,
        translations: c.category.translations.map((t) => ({
          languageCode: t.languageCode,
          name: t.name,
          handle: t.handle,
        })),
      },
    })),
  };
}

// ── Create Product ──────────────────────────────────────────────────────────

export async function createProduct(body: CreateProductBody): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    // 1. Insert product
    const [product] = await tx
      .insert(products)
      .values({
        baseSku: body.baseSku,
        status: body.status,
        type: body.type,
        taxClassId: body.taxClassId,
      })
      .returning({ id: products.id });

    // 2. Insert translations
    if (body.translations.length > 0) {
      await tx.insert(productTranslations).values(
        body.translations.map((t) => ({
          productId: product.id,
          languageCode: t.languageCode,
          name: t.name,
          description: t.description,
          handle: t.handle,
        }))
      );
    }

    // 3. Insert options + option values (track IDs for variant linking)
    // optionValueIdMap[optionIndex][valueIndex] = uuid
    const optionValueIdMap: string[][] = [];

    for (let oi = 0; oi < body.options.length; oi++) {
      const opt = body.options[oi];

      const [option] = await tx
        .insert(productOptions)
        .values({ productId: product.id })
        .returning({ id: productOptions.id });

      if (opt.translations.length > 0) {
        await tx.insert(productOptionTranslations).values(
          opt.translations.map((t) => ({
            optionId: option.id,
            languageCode: t.languageCode,
            name: t.name,
          }))
        );
      }

      const valueIds: string[] = [];
      for (let vi = 0; vi < opt.values.length; vi++) {
        const val = opt.values[vi];

        const [value] = await tx
          .insert(productOptionValues)
          .values({ optionId: option.id })
          .returning({ id: productOptionValues.id });

        valueIds.push(value.id);

        if (val.translations.length > 0) {
          await tx.insert(productOptionValueTranslations).values(
            val.translations.map((t) => ({
              valueId: value.id,
              languageCode: t.languageCode,
              label: t.label,
            }))
          );
        }
      }
      optionValueIdMap.push(valueIds);
    }

    // 4. Insert variants
    //
    // For `simple` products, when the client does not send a variant we
    // auto-create a single default variant so that downstream features
    // (pricing, inventory, orders) always have something to attach to.
    // `variable` products start with no variants — the user adds options
    // and generates variants afterwards on the edit page.
    const defaultVariantSku =
      body.baseSku ?? body.translations[0]?.handle ?? `product-${product.id.slice(0, 8)}`;

    const variantsToInsert: CreateProductBody['variants'] =
      body.variants.length > 0
        ? body.variants
        : body.type === 'simple'
        ? [
            {
              sku: defaultVariantSku,
              status: body.status,
              optionValueIndices: [],
              prices: [
                {
                  currencyCode: 'EUR',
                  amount: 0,
                  minQuantity: 1,
                  taxInclusive: true,
                },
              ],
            },
          ]
        : [];

    for (const variant of variantsToInsert) {
      // Create price set + prices
      const [priceSet] = await tx
        .insert(priceSets)
        .values({})
        .returning({ id: priceSets.id });

      if (variant.prices.length > 0) {
        await tx.insert(prices).values(
          variant.prices.map((p) => ({
            priceSetId: priceSet.id,
            currencyCode: p.currencyCode,
            amount: p.amount,
            compareAtAmount: p.compareAtAmount,
            minQuantity: p.minQuantity,
            taxInclusive: p.taxInclusive,
          }))
        );
      }

      // Create inventory item
      const [invItem] = await tx
        .insert(inventoryItems)
        .values({ skuReference: variant.sku })
        .returning({ id: inventoryItems.id });

      // Create variant
      const [v] = await tx
        .insert(productVariants)
        .values({
          productId: product.id,
          sku: variant.sku,
          status: variant.status ?? 'draft',
          weight: variant.weight,
          barcode: variant.barcode,
          priceSetId: priceSet.id,
          inventoryItemId: invItem.id,
        })
        .returning({ id: productVariants.id });

      // Link variant to option values
      const valueLinks: { variantId: string; valueId: string }[] = [];
      for (const indices of variant.optionValueIndices) {
        if (indices.length === 2) {
          const [optIdx, valIdx] = indices;
          const valueId = optionValueIdMap[optIdx]?.[valIdx];
          if (valueId) {
            valueLinks.push({ variantId: v.id, valueId });
          }
        }
      }
      if (valueLinks.length > 0) {
        await tx.insert(variantOptionValues).values(valueLinks);
      }
    }

    // 5. Insert category associations
    if (body.categoryIds.length > 0) {
      await tx.insert(productCategories).values(
        body.categoryIds.map((categoryId) => ({
          productId: product.id,
          categoryId,
        }))
      );
    }

    return { id: product.id };
  });
}

// ── Update Product ──────────────────────────────────────────────────────────

export async function updateProduct(
  id: string,
  body: UpdateProductBody
): Promise<ProductDetailResponse | null> {
  return db.transaction(async (tx) => {
    // Check existence
    const existing = await tx
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), ne(products.status, 'deleted')))
      .limit(1);
    if (existing.length === 0) return null;

    // Update product-level fields
    const updateFields: Record<string, unknown> = {};
    if (body.baseSku !== undefined) updateFields.baseSku = body.baseSku;
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.taxClassId !== undefined) updateFields.taxClassId = body.taxClassId;

    if (Object.keys(updateFields).length > 0) {
      await tx.update(products).set(updateFields).where(eq(products.id, id));
    }

    // Upsert translations: delete + re-insert for simplicity
    if (body.translations) {
      await tx
        .delete(productTranslations)
        .where(eq(productTranslations.productId, id));
      if (body.translations.length > 0) {
        await tx.insert(productTranslations).values(
          body.translations.map((t) => ({
            productId: id,
            languageCode: t.languageCode,
            name: t.name,
            description: t.description,
            handle: t.handle,
          }))
        );
      }
    }

    // Replace category associations
    if (body.categoryIds !== undefined) {
      await tx
        .delete(productCategories)
        .where(eq(productCategories.productId, id));
      if (body.categoryIds.length > 0) {
        await tx.insert(productCategories).values(
          body.categoryIds.map((categoryId) => ({
            productId: id,
            categoryId,
          }))
        );
      }
    }

    return null; // caller will re-fetch via getProduct
  });
}

// ── Delete Product (soft) ───────────────────────────────────────────────────

export async function deleteProduct(id: string): Promise<boolean> {
  const result = await db
    .update(products)
    .set({ status: 'deleted' })
    .where(and(eq(products.id, id), ne(products.status, 'deleted')))
    .returning({ id: products.id });
  return result.length > 0;
}

// ── Update Variant (independent) ────────────────────────────────────────────

export async function updateVariant(
  productId: string,
  variantId: string,
  body: UpdateVariantBody
): Promise<boolean> {
  return db.transaction(async (tx) => {
    // Verify variant belongs to product
    const existing = await tx
      .select({ id: productVariants.id, priceSetId: productVariants.priceSetId })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.productId, productId),
          ne(productVariants.status, 'deleted')
        )
      )
      .limit(1);
    if (existing.length === 0) return false;

    // Update variant fields
    const variantFields: Record<string, unknown> = {};
    if (body.sku !== undefined) variantFields.sku = body.sku;
    if (body.weight !== undefined) variantFields.weight = body.weight;
    if (body.barcode !== undefined) variantFields.barcode = body.barcode;
    if (body.status !== undefined) variantFields.status = body.status;

    if (Object.keys(variantFields).length > 0) {
      await tx
        .update(productVariants)
        .set(variantFields)
        .where(eq(productVariants.id, variantId));
    }

    // Upsert prices: delete all then re-insert
    if (body.prices) {
      const priceSetId = existing[0].priceSetId;
      await tx.delete(prices).where(eq(prices.priceSetId, priceSetId));
      if (body.prices.length > 0) {
        await tx.insert(prices).values(
          body.prices.map((p) => ({
            priceSetId,
            currencyCode: p.currencyCode,
            amount: p.amount,
            compareAtAmount: p.compareAtAmount,
            minQuantity: p.minQuantity,
            taxInclusive: p.taxInclusive,
          }))
        );
      }
    }

    return true;
  });
}

// ── Generate Variants ───────────────────────────────────────────────────────

export async function generateVariants(
  productId: string,
  body: GenerateVariantsBody
): Promise<{ created: number }> {
  return db.transaction(async (tx) => {
    // Load product options with values
    const opts = await tx.query.productOptions.findMany({
      where: eq(productOptions.productId, productId),
      with: {
        values: {
          with: { translations: true },
        },
        translations: true,
      },
    });

    if (opts.length === 0) {
      return { created: 0 };
    }

    // Compute cartesian product of option value IDs
    const optionValueSets = opts.map((o) => o.values.map((v) => v.id));
    const combos = cartesian(optionValueSets);

    // Load existing variant-option-value combos for this product
    const existingVariants = await tx
      .select({
        variantId: variantOptionValues.variantId,
        valueId: variantOptionValues.valueId,
      })
      .from(variantOptionValues)
      .innerJoin(
        productVariants,
        eq(variantOptionValues.variantId, productVariants.id)
      )
      .where(
        and(
          eq(productVariants.productId, productId),
          ne(productVariants.status, 'deleted')
        )
      );

    // Group existing combos by variant
    const existingCombos = new Map<string, Set<string>>();
    for (const row of existingVariants) {
      if (!existingCombos.has(row.variantId)) {
        existingCombos.set(row.variantId, new Set());
      }
      existingCombos.get(row.variantId)!.add(row.valueId);
    }

    // Build set of existing combo signatures for dedup
    const existingSignatures = new Set<string>();
    for (const valueSet of existingCombos.values()) {
      existingSignatures.add([...valueSet].sort().join(','));
    }

    // Filter to only new combos
    const newCombos = combos.filter(
      (combo) => !existingSignatures.has([...combo].sort().join(','))
    );

    if (newCombos.length === 0) {
      return { created: 0 };
    }

    // Build lookup for generating SKU labels
    const valueLabels = new Map<string, string>();
    for (const opt of opts) {
      for (const v of opt.values) {
        const label = v.translations[0]?.label ?? v.id.slice(0, 8);
        valueLabels.set(v.id, label);
      }
    }

    const prefix = body.skuPrefix ?? 'VAR';

    // Create each new variant
    let created = 0;
    for (const combo of newCombos) {
      const skuParts = combo.map((vid) =>
        (valueLabels.get(vid) ?? vid.slice(0, 4)).toUpperCase().replace(/\s+/g, '-')
      );
      const sku = `${prefix}-${skuParts.join('-')}`;

      // Price set + prices
      const [priceSet] = await tx
        .insert(priceSets)
        .values({})
        .returning({ id: priceSets.id });

      if (body.defaultPrices.length > 0) {
        await tx.insert(prices).values(
          body.defaultPrices.map((p) => ({
            priceSetId: priceSet.id,
            currencyCode: p.currencyCode,
            amount: p.amount,
            compareAtAmount: p.compareAtAmount,
            minQuantity: p.minQuantity,
            taxInclusive: p.taxInclusive,
          }))
        );
      }

      // Inventory item
      const [invItem] = await tx
        .insert(inventoryItems)
        .values({ skuReference: sku })
        .returning({ id: inventoryItems.id });

      // Variant
      const [variant] = await tx
        .insert(productVariants)
        .values({
          productId,
          sku,
          status: 'draft',
          weight: body.defaultWeight,
          priceSetId: priceSet.id,
          inventoryItemId: invItem.id,
        })
        .returning({ id: productVariants.id });

      // Link option values
      await tx.insert(variantOptionValues).values(
        combo.map((valueId) => ({
          variantId: variant.id,
          valueId,
        }))
      );

      created++;
    }

    return { created };
  });
}

// Cartesian product of arrays of values
function cartesian(sets: string[][]): string[][] {
  if (sets.length === 0) return [[]];
  const [first, ...rest] = sets;
  const restCombos = cartesian(rest);
  return first.flatMap((val) => restCombos.map((combo) => [val, ...combo]));
}
