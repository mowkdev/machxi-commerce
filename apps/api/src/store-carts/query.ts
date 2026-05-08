// Cart projection: load + compute, used by every read and mutation.
//
// We always recompute totals on every fetch — promotions can expire, base
// prices can change, tax rules can shift. The persisted cart row carries only
// raw associations (items, promotions, addresses); pricing is derived.

import { db } from "@repo/database/client";
import { and, eq, inArray } from "@repo/database";
import {
  addresses,
  cartItems,
  cartPromotions,
  carts,
  categoryTranslations,
  languages,
  optionValueTranslations,
  productCategories,
  productOptionValues,
  productTranslations,
  productVariants,
  products,
  promotionAmounts,
  promotionTargets,
  promotions,
  variantOptionValues,
  productOptions,
  optionValues,
} from "@repo/database/schema";
import type { StoreCart } from "./schema";
import { resolveVariantPrices } from "../store-pricing/service";
import {
  computeCart,
  type ComputeCartLine,
  type ComputeCartPromotion,
} from "./compute";

async function defaultLanguageCode(): Promise<string> {
  const [row] = await db
    .select({ code: languages.code })
    .from(languages)
    .where(eq(languages.isDefault, true))
    .limit(1);
  if (!row) throw new Error("No default language configured");
  return row.code;
}

export async function loadCart(cartId: string): Promise<StoreCart | null> {
  const [cart] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1);
  if (!cart) return null;

  const language = await defaultLanguageCode();

  const itemRows = await db
    .select({
      id: cartItems.id,
      variantId: cartItems.variantId,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));

  // Even an empty cart should compute totals (all zeros).
  const variantIds = itemRows.map((r) => r.variantId);
  const variantData = variantIds.length
    ? await db
        .select({
          variantId: productVariants.id,
          sku: productVariants.sku,
          productId: productVariants.productId,
          taxClassId: products.taxClassId,
          productName: productTranslations.name,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .leftJoin(
          productTranslations,
          and(
            eq(productTranslations.productId, productVariants.productId),
            eq(productTranslations.languageCode, language),
          ),
        )
        .where(inArray(productVariants.id, variantIds))
    : [];
  const byVariant = new Map(variantData.map((v) => [v.variantId, v]));

  // Variant-title from option value translations (joined order-by-rank).
  const variantTitleMap = new Map<string, string>();
  if (variantIds.length > 0) {
    const optionRows = await db
      .select({
        variantId: variantOptionValues.variantId,
        productOptionRank: productOptions.rank,
        productOptionValueRank: productOptionValues.rank,
        valueLabel: optionValueTranslations.label,
        valueCode: optionValues.code,
      })
      .from(variantOptionValues)
      .innerJoin(
        productOptionValues,
        eq(productOptionValues.id, variantOptionValues.valueId),
      )
      .innerJoin(
        productOptions,
        eq(productOptions.id, productOptionValues.productOptionId),
      )
      .innerJoin(
        optionValues,
        eq(optionValues.id, productOptionValues.optionValueId),
      )
      .leftJoin(
        optionValueTranslations,
        and(
          eq(optionValueTranslations.valueId, optionValues.id),
          eq(optionValueTranslations.languageCode, language),
        ),
      )
      .where(inArray(variantOptionValues.variantId, variantIds));

    const grouped = new Map<
      string,
      Array<{ rank: number; label: string }>
    >();
    for (const row of optionRows) {
      const arr = grouped.get(row.variantId) ?? [];
      arr.push({
        rank: row.productOptionRank * 1000 + row.productOptionValueRank,
        label: row.valueLabel ?? row.valueCode,
      });
      grouped.set(row.variantId, arr);
    }
    for (const [variantId, items] of grouped) {
      items.sort((a, b) => a.rank - b.rank);
      variantTitleMap.set(variantId, items.map((i) => i.label).join(" / "));
    }
  }

  // Promotions
  const promotionRows = await db
    .select({
      id: promotions.id,
      code: promotions.code,
      type: promotions.type,
      percentageValue: promotions.percentageValue,
    })
    .from(cartPromotions)
    .innerJoin(promotions, eq(promotions.id, cartPromotions.promotionId))
    .where(eq(cartPromotions.cartId, cartId));

  const promotionIds = promotionRows.map((p) => p.id);

  const [amountRows, targetRows] = await Promise.all([
    promotionIds.length > 0
      ? db
          .select({
            promotionId: promotionAmounts.promotionId,
            currencyCode: promotionAmounts.currencyCode,
            amount: promotionAmounts.amount,
          })
          .from(promotionAmounts)
          .where(inArray(promotionAmounts.promotionId, promotionIds))
      : Promise.resolve([]),
    promotionIds.length > 0
      ? db
          .select({
            promotionId: promotionTargets.promotionId,
            productId: promotionTargets.productId,
            categoryId: promotionTargets.categoryId,
          })
          .from(promotionTargets)
          .where(inArray(promotionTargets.promotionId, promotionIds))
      : Promise.resolve([]),
  ]);

  const amountByPromo = new Map<string, number>();
  for (const a of amountRows) {
    if (a.currencyCode === cart.currencyCode) {
      amountByPromo.set(a.promotionId, a.amount);
    }
  }

  const productTargetsByPromo = new Map<string, Set<string>>();
  const categoryTargetsByPromo = new Map<string, Set<string>>();
  for (const t of targetRows) {
    if (t.productId) {
      const set = productTargetsByPromo.get(t.promotionId) ?? new Set();
      set.add(t.productId);
      productTargetsByPromo.set(t.promotionId, set);
    } else if (t.categoryId) {
      const set = categoryTargetsByPromo.get(t.promotionId) ?? new Set();
      set.add(t.categoryId);
      categoryTargetsByPromo.set(t.promotionId, set);
    }
  }

  // Map productId → category ids for promotion target matching.
  const productIds = Array.from(
    new Set(variantData.map((v) => v.productId)),
  );
  const productCategoriesMap = new Map<string, Set<string>>();
  if (productIds.length > 0) {
    const pc = await db
      .select({
        productId: productCategories.productId,
        categoryId: productCategories.categoryId,
      })
      .from(productCategories)
      .where(inArray(productCategories.productId, productIds));
    for (const row of pc) {
      const set = productCategoriesMap.get(row.productId) ?? new Set();
      set.add(row.categoryId);
      productCategoriesMap.set(row.productId, set);
    }
  }

  // resolveVariantPrices is built for batch with a single qty, but cart items
  // can have different quantities and pricing tiers can be qty-dependent. We
  // call once per cart item to keep the tier resolution correct.
  type ResolvedPrice = NonNullable<
    Awaited<ReturnType<typeof resolveVariantPrices>>
  > extends Map<string, infer V>
    ? V
    : never;
  const itemPrice = new Map<string, ResolvedPrice>();
  for (const item of itemRows) {
    const map = await resolveVariantPrices(
      [item.variantId],
      cart.currencyCode,
      item.quantity,
    );
    const price = map.get(item.variantId);
    if (price) itemPrice.set(item.id, price as ResolvedPrice);
  }

  // Shipping context (for tax)
  let shippingCountry: string | null = null;
  let shippingProvince: string | null = null;
  if (cart.shippingAddressId) {
    const [addr] = await db
      .select({
        countryCode: addresses.countryCode,
        provinceCode: addresses.provinceCode,
      })
      .from(addresses)
      .where(eq(addresses.id, cart.shippingAddressId))
      .limit(1);
    if (addr) {
      shippingCountry = addr.countryCode;
      shippingProvince = addr.provinceCode;
    }
  }

  const computeLines: ComputeCartLine[] = [];
  for (const item of itemRows) {
    const variant = byVariant.get(item.variantId);
    const price = itemPrice.get(item.id);
    if (!variant || !price) continue; // variant deleted or no price in currency
    computeLines.push({
      id: item.id,
      variantId: item.variantId,
      productId: variant.productId,
      taxClassId: variant.taxClassId,
      sku: variant.sku,
      title: variant.productName ?? variant.sku,
      variantTitle: variantTitleMap.get(item.variantId) ?? null,
      thumbnailUrl: null,
      quantity: item.quantity,
      resolvedPrice: price,
    });
  }

  const computePromotions: ComputeCartPromotion[] = promotionRows.map((p) => ({
    id: p.id,
    code: p.code,
    type: p.type as ComputeCartPromotion["type"],
    percentageValue: p.percentageValue,
    fixedAmount: amountByPromo.get(p.id) ?? null,
    productTargets: productTargetsByPromo.get(p.id) ?? new Set(),
    categoryTargets: categoryTargetsByPromo.get(p.id) ?? new Set(),
  }));

  const computed = await computeCart({
    currencyCode: cart.currencyCode,
    lines: computeLines,
    promotions: computePromotions,
    productCategories: productCategoriesMap,
    shipping: { countryCode: shippingCountry, provinceCode: shippingProvince },
  });

  return {
    id: cart.id,
    customerId: cart.customerId,
    guestEmail: cart.guestEmail ?? null,
    currencyCode: cart.currencyCode,
    shippingAddressId: cart.shippingAddressId,
    billingAddressId: cart.billingAddressId,
    expiresAt: cart.expiresAt,
    items: computed.lines,
    promotions: computed.promotions,
    totals: computed.totals,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
}

void categoryTranslations;
