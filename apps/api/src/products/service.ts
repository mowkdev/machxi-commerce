import { db } from '@repo/database/client';
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  sql,
} from '@repo/database';
import {
  languages,
  products,
  productTranslations,
  optionDefinitions,
  optionDefinitionTranslations,
  optionValues,
  optionValueTranslations,
  productOptions,
  productOptionValues,
  productVariants,
  variantOptionValues,
  productCategories,
  priceSets,
  prices,
  inventoryItems,
  inventoryTransactions,
  productMedia,
  variantMedia,
} from '@repo/database/schema';
import type { PaginationMeta } from '@repo/types';
import type {
  CreateProductBody,
  UpdateProductBody,
  UpdateVariantBody,
  GenerateVariantsBody,
  ProductDetailResponse,
  OptionCatalogOption,
} from '@repo/types/admin';
import type { ListOptionDefinitionsQuery, ListProductsQuery, ProductListRow } from './schema';

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

type CatalogTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type SubmittedOption = NonNullable<GenerateVariantsBody['options']>[number];
type SubmittedOptionValue = SubmittedOption['values'][number];

function codeFromText(text: string): string {
  const code = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return code || `option-${Date.now()}`;
}

function firstOptionName(option: SubmittedOption): string | undefined {
  return option.translations[0]?.name.trim() || undefined;
}

function firstValueLabel(value: SubmittedOptionValue): string | undefined {
  return value.translations[0]?.label.trim() || undefined;
}

async function upsertOptionTranslations(
  tx: CatalogTx,
  optionId: string,
  translations: SubmittedOption['translations']
) {
  if (translations.length === 0) return;
  await tx
    .insert(optionDefinitionTranslations)
    .values(
      translations.map((translation) => ({
        optionId,
        languageCode: translation.languageCode,
        name: translation.name,
      }))
    )
    .onConflictDoNothing();
}

async function upsertValueTranslations(
  tx: CatalogTx,
  valueId: string,
  translations: SubmittedOptionValue['translations']
) {
  if (translations.length === 0) return;
  await tx
    .insert(optionValueTranslations)
    .values(
      translations.map((translation) => ({
        valueId,
        languageCode: translation.languageCode,
        label: translation.label,
      }))
    )
    .onConflictDoNothing();
}

async function resolveOptionDefinition(tx: CatalogTx, option: SubmittedOption) {
  if (option.optionId) {
    const [existing] = await tx
      .select({ id: optionDefinitions.id, code: optionDefinitions.code })
      .from(optionDefinitions)
      .where(eq(optionDefinitions.id, option.optionId))
      .limit(1);
    if (!existing) throw new Error('Option definition not found');
    await upsertOptionTranslations(tx, existing.id, option.translations);
    return existing;
  }

  const name = firstOptionName(option);
  const code = option.code?.trim() ?? (name ? codeFromText(name) : undefined);
  if (!code) throw new Error('Option name or code is required');

  const [existing] = await tx
    .select({ id: optionDefinitions.id, code: optionDefinitions.code })
    .from(optionDefinitions)
    .where(eq(optionDefinitions.code, code))
    .limit(1);
  if (existing) {
    await upsertOptionTranslations(tx, existing.id, option.translations);
    return existing;
  }

  const [created] = await tx
    .insert(optionDefinitions)
    .values({ code })
    .returning({ id: optionDefinitions.id, code: optionDefinitions.code });
  await upsertOptionTranslations(tx, created.id, option.translations);
  return created;
}

async function resolveOptionValue(
  tx: CatalogTx,
  optionId: string,
  value: SubmittedOptionValue
) {
  if (value.valueId) {
    const [existing] = await tx
      .select({ id: optionValues.id, code: optionValues.code, optionId: optionValues.optionId })
      .from(optionValues)
      .where(eq(optionValues.id, value.valueId))
      .limit(1);
    if (!existing || existing.optionId !== optionId) {
      throw new Error('Option value not found for option');
    }
    await upsertValueTranslations(tx, existing.id, value.translations);
    return existing;
  }

  const label = firstValueLabel(value);
  const code = value.code?.trim() ?? (label ? codeFromText(label) : undefined);
  if (!code) throw new Error('Option value label or code is required');

  const [existing] = await tx
    .select({ id: optionValues.id, code: optionValues.code, optionId: optionValues.optionId })
    .from(optionValues)
    .where(and(eq(optionValues.optionId, optionId), eq(optionValues.code, code)))
    .limit(1);
  if (existing) {
    await upsertValueTranslations(tx, existing.id, value.translations);
    return existing;
  }

  const [created] = await tx
    .insert(optionValues)
    .values({ optionId, code })
    .returning({ id: optionValues.id, code: optionValues.code, optionId: optionValues.optionId });
  await upsertValueTranslations(tx, created.id, value.translations);
  return created;
}

async function insertSubmittedProductOptions(
  tx: CatalogTx,
  productId: string,
  submittedOptions: SubmittedOption[]
): Promise<string[][]> {
  const seenOptionIds = new Set<string>();
  const optionValueIdMap: string[][] = [];

  for (let optionIndex = 0; optionIndex < submittedOptions.length; optionIndex++) {
    const submittedOption = submittedOptions[optionIndex];
    const optionDefinition = await resolveOptionDefinition(tx, submittedOption);
    if (seenOptionIds.has(optionDefinition.id)) {
      throw new Error('Option definitions must be unique per product');
    }
    seenOptionIds.add(optionDefinition.id);

    const [productOption] = await tx
      .insert(productOptions)
      .values({
        productId,
        optionId: optionDefinition.id,
        rank: optionIndex,
      })
      .returning({ id: productOptions.id });

    const seenValueIds = new Set<string>();
    const valueIds: string[] = [];
    for (let valueIndex = 0; valueIndex < submittedOption.values.length; valueIndex++) {
      const optionValue = await resolveOptionValue(
        tx,
        optionDefinition.id,
        submittedOption.values[valueIndex]
      );
      if (seenValueIds.has(optionValue.id)) {
        throw new Error('Option values must be unique per product option');
      }
      seenValueIds.add(optionValue.id);

      const [productOptionValue] = await tx
        .insert(productOptionValues)
        .values({
          productOptionId: productOption.id,
          optionValueId: optionValue.id,
          rank: valueIndex,
        })
        .returning({ id: productOptionValues.id });
      valueIds.push(productOptionValue.id);
    }
    optionValueIdMap.push(valueIds);
  }

  return optionValueIdMap;
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

// ── List Reusable Option Definitions ────────────────────────────────────────

export async function listOptionDefinitions(
  query: ListOptionDefinitionsQuery
): Promise<OptionCatalogOption[]> {
  const languageCode = query.languageCode ?? (await getDefaultLanguageCode());
  const searchPattern = query.search ? `%${query.search}%` : undefined;

  const rows = await db.query.optionDefinitions.findMany({
    where: searchPattern
      ? sql`exists (
          select 1 from option_definition_translations odt
          where odt.option_id = ${optionDefinitions.id}
            and odt.name ilike ${searchPattern}
        )`
      : undefined,
    with: {
      translations: languageCode
        ? { where: eq(optionDefinitionTranslations.languageCode, languageCode) }
        : true,
      values: {
        with: {
          translations: languageCode
            ? { where: eq(optionValueTranslations.languageCode, languageCode) }
            : true,
        },
      },
    },
    orderBy: asc(optionDefinitions.code),
  });

  return rows.map((option) => ({
    id: option.id,
    code: option.code,
    translations: option.translations.map((translation) => ({
      id: translation.id,
      languageCode: translation.languageCode,
      name: translation.name,
    })),
    values: option.values.map((value) => ({
      id: value.id,
      code: value.code,
      translations: value.translations.map((translation) => ({
        id: translation.id,
        languageCode: translation.languageCode,
        label: translation.label,
      })),
    })),
  }));
}

// ── Get Product Detail ──────────────────────────────────────────────────────

export async function getProduct(id: string): Promise<ProductDetailResponse | null> {
  const result = await db.query.products.findFirst({
    where: and(eq(products.id, id), ne(products.status, 'deleted')),
    with: {
      translations: true,
      options: {
        with: {
          option: {
            with: { translations: true },
          },
          values: {
            with: {
              optionValue: {
                with: { translations: true },
              },
            },
            orderBy: asc(productOptionValues.rank),
          },
        },
        orderBy: asc(productOptions.rank),
      },
      variants: {
        where: ne(productVariants.status, 'deleted'),
        with: {
          optionValues: {
            with: {
              value: {
                with: {
                  optionValue: {
                    with: { translations: true },
                  },
                },
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
            orderBy: asc(variantMedia.rank),
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
      optionId: o.optionId,
      code: o.option.code,
      rank: o.rank,
      translations: o.option.translations.map((t) => ({
        id: t.id,
        languageCode: t.languageCode,
        name: t.name,
      })),
      values: o.values.map((v) => ({
        id: v.id,
        valueId: v.optionValueId,
        code: v.optionValue.code,
        translations: v.optionValue.translations.map((t) => ({
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
          valueId: ov.value.optionValueId,
          code: ov.value.optionValue.code,
          productOptionId: ov.value.productOptionId,
          translations: ov.value.optionValue.translations.map((t) => ({
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
          mimeType: m.media.mimeType,
          altText: m.media.altText,
        },
      })),
    })),
    media: result.media.map((m) => ({
      mediaId: m.mediaId,
      rank: m.rank,
      media: {
        id: m.media.id,
        url: m.media.url,
        mimeType: m.media.mimeType,
        altText: m.media.altText,
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

    // 3. Insert product option assignments and track product-scoped value IDs
    // for variant linking: optionValueIdMap[optionIndex][valueIndex] = uuid.
    const optionValueIdMap = await insertSubmittedProductOptions(tx, product.id, body.options);

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

    if (body.media !== undefined) {
      await tx.delete(productMedia).where(eq(productMedia.productId, id));
      if (body.media.length > 0) {
        await tx.insert(productMedia).values(
          body.media.map((item, index) => ({
            productId: id,
            mediaId: item.mediaId,
            rank: item.rank ?? index,
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

    if (body.media !== undefined) {
      await tx.delete(variantMedia).where(eq(variantMedia.variantId, variantId));
      if (body.media.length > 0) {
        await tx.insert(variantMedia).values(
          body.media.map((item, index) => ({
            variantId,
            mediaId: item.mediaId,
            rank: item.rank ?? index,
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
    const submittedOptions = body.options ?? [];

    if (submittedOptions.length > 0) {
      const optionKeys = submittedOptions.map((option) =>
        option.optionId ?? option.code?.trim().toLowerCase() ?? firstOptionName(option)?.toLowerCase()
      );
      if (optionKeys.some((key) => !key)) {
        throw new Error('Option name, code, or id is required');
      }
      if (new Set(optionKeys).size !== optionKeys.length) {
        throw new Error('Option definitions must be unique per product');
      }
      if (submittedOptions.some((option) => option.values.length === 0)) {
        throw new Error('Each option must have at least one value');
      }
    }

    const loadOptions = () =>
      tx.query.productOptions.findMany({
        where: eq(productOptions.productId, productId),
        with: {
          option: {
            with: { translations: true },
          },
          values: {
            with: {
              optionValue: {
                with: { translations: true },
              },
            },
            orderBy: asc(productOptionValues.rank),
          },
        },
        orderBy: asc(productOptions.rank),
      });

    const insertSubmittedOptions = async () => {
      await insertSubmittedProductOptions(tx, productId, submittedOptions);
    };

    // Load product options with values
    let opts = await loadOptions();

    if (body.regenerate) {
      if (submittedOptions.length === 0) {
        throw new Error('Options are required to regenerate variants');
      }

      const oldVariants = await tx
        .select({
          id: productVariants.id,
          priceSetId: productVariants.priceSetId,
          inventoryItemId: productVariants.inventoryItemId,
        })
        .from(productVariants)
        .where(eq(productVariants.productId, productId));

      const oldVariantIds = oldVariants.map((variant) => variant.id);
      if (oldVariantIds.length > 0) {
        await tx
          .delete(variantOptionValues)
          .where(inArray(variantOptionValues.variantId, oldVariantIds));
      }

      await tx.delete(productVariants).where(eq(productVariants.productId, productId));
      await tx.delete(productOptions).where(eq(productOptions.productId, productId));

      const oldPriceSetIds = [
        ...new Set(oldVariants.map((variant) => variant.priceSetId)),
      ];
      if (oldPriceSetIds.length > 0) {
        await tx.delete(priceSets).where(inArray(priceSets.id, oldPriceSetIds));
      }

      const oldInventoryItemIds = [
        ...new Set(
          oldVariants
            .map((variant) => variant.inventoryItemId)
            .filter((id): id is string => Boolean(id))
        ),
      ];
      if (oldInventoryItemIds.length > 0) {
        const protectedInventoryRows = await tx
          .select({ inventoryItemId: inventoryTransactions.inventoryItemId })
          .from(inventoryTransactions)
          .where(inArray(inventoryTransactions.inventoryItemId, oldInventoryItemIds));
        const protectedInventoryIds = new Set(
          protectedInventoryRows.map((row) => row.inventoryItemId)
        );
        const deletableInventoryItemIds = oldInventoryItemIds.filter(
          (id) => !protectedInventoryIds.has(id)
        );
        if (deletableInventoryItemIds.length > 0) {
          await tx
            .delete(inventoryItems)
            .where(inArray(inventoryItems.id, deletableInventoryItemIds));
        }
      }

      await insertSubmittedOptions();
      opts = await loadOptions();
    } else if (opts.length === 0 && submittedOptions.length > 0) {
      await insertSubmittedOptions();
      opts = await loadOptions();
    }

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
        const label = v.optionValue.translations[0]?.label ?? v.optionValue.code ?? v.id.slice(0, 8);
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
