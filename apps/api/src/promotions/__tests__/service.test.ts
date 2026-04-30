import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '@repo/database/client';
import { eq } from '@repo/database';
import {
  categories,
  categoryTranslations,
  languages,
  products,
  productTranslations,
  promotionAmounts,
  taxClasses,
} from '@repo/database/schema';
import type { CreatePromotionBody } from '@repo/types/admin';
import {
  createPromotion,
  createPromotionAmount,
  createPromotionTarget,
  deletePromotion,
  deletePromotionAmount,
  getPromotion,
  listPromotions,
  PromotionValidationError,
  updatePromotion,
  updatePromotionAmount,
} from '../service';

beforeAll(async () => {
  const existingLang = await db
    .select()
    .from(languages)
    .where(eq(languages.code, 'en'))
    .limit(1);

  if (existingLang.length === 0) {
    await db.insert(languages).values({
      code: 'en',
      name: 'English',
      isDefault: true,
    });
  }
});

function uniqueToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeCreateBody(label: string, overrides?: Partial<CreatePromotionBody>) {
  const token = uniqueToken();

  return {
    code: `${label}-${token}`,
    type: 'percentage',
    percentageValue: 10,
    startsAt: null,
    expiresAt: null,
    usageLimit: null,
    usageLimitPerCustomer: null,
    minCartAmount: 0,
    minCartQuantity: 0,
    translations: [
      {
        languageCode: 'en',
        displayName: `${label} ${token}`,
        terms: `${label} terms`,
      },
    ],
    amounts: [],
    targets: [],
    ...overrides,
  } satisfies CreatePromotionBody;
}

async function createProductTarget() {
  const token = uniqueToken();
  const [taxClass] = await db
    .insert(taxClasses)
    .values({ name: `Promotion Target Tax ${token}` })
    .returning({ id: taxClasses.id });
  const [product] = await db
    .insert(products)
    .values({
      taxClassId: taxClass.id,
      baseSku: `promo-target-${token}`,
      status: 'published',
      type: 'simple',
    })
    .returning({ id: products.id });
  await db.insert(productTranslations).values({
    productId: product.id,
    languageCode: 'en',
    name: `Promotion Target Product ${token}`,
    handle: `promotion-target-product-${token}`,
  });
  return product.id;
}

async function createCategoryTarget() {
  const token = uniqueToken();
  const [category] = await db
    .insert(categories)
    .values({ rank: Math.floor(Math.random() * 1_000_000) })
    .returning({ id: categories.id });
  await db.insert(categoryTranslations).values({
    categoryId: category.id,
    languageCode: 'en',
    name: `Promotion Target Category ${token}`,
    handle: `promotion-target-category-${token}`,
  });
  return category.id;
}

describe('promotion service', () => {
  it('creates and retrieves a percentage promotion with translations', async () => {
    const body = makeCreateBody('Welcome');

    const result = await createPromotion(body);
    const promotion = await getPromotion(result.id);

    expect(promotion).not.toBeNull();
    expect(promotion!.code).toBe(body.code.toUpperCase());
    expect(promotion!.type).toBe('percentage');
    expect(promotion!.percentageValue).toBe('10.00');
    expect(promotion!.translations[0].displayName).toBe(body.translations[0].displayName);
  });

  it('lists promotions with search, filters, schedule state, and metadata', async () => {
    const startsAt = new Date('2030-01-01T00:00:00.000Z').toISOString();
    const body = makeCreateBody('Scheduled Promotion', {
      type: 'free_shipping',
      percentageValue: null,
      startsAt,
    });
    await createPromotion(body);

    const result = await listPromotions({
      page: 1,
      pageSize: 20,
      search: body.translations[0].displayName,
      languageCode: 'en',
      type: 'free_shipping',
      scheduleState: 'scheduled',
      sortBy: 'displayName',
      sortOrder: 'asc',
    });

    expect(result.meta.totalItems).toBeGreaterThanOrEqual(1);
    expect(result.data.some((promotion) => promotion.code === body.code.toUpperCase())).toBe(true);
  });

  it('creates and manages fixed amount rows', async () => {
    const created = await createPromotion(
      makeCreateBody('Fixed Amount', {
        type: 'fixed_amount',
        percentageValue: null,
        amounts: [{ currencyCode: 'usd', amount: 500 }],
      })
    );
    const promotion = await getPromotion(created.id);

    expect(promotion!.amounts).toHaveLength(1);
    expect(promotion!.amounts[0].currencyCode).toBe('USD');

    const updated = await updatePromotionAmount(created.id, promotion!.amounts[0].id, {
      amount: 600,
    });
    expect(updated!.amount).toBe(600);

    const eur = await createPromotionAmount(created.id, { currencyCode: 'eur', amount: 700 });
    expect(eur!.currencyCode).toBe('EUR');

    await expect(deletePromotionAmount(created.id, eur!.id)).resolves.toBe(true);
  });

  it('rejects deleting the last fixed amount row', async () => {
    const created = await createPromotion(
      makeCreateBody('Single Fixed Amount', {
        type: 'fixed_amount',
        percentageValue: null,
        amounts: [{ currencyCode: 'USD', amount: 500 }],
      })
    );
    const rows = await db
      .select()
      .from(promotionAmounts)
      .where(eq(promotionAmounts.promotionId, created.id));

    await expect(deletePromotionAmount(created.id, rows[0].id)).rejects.toBeInstanceOf(
      PromotionValidationError
    );
  });

  it('updates promotion fields and default translation', async () => {
    const created = await createPromotion(makeCreateBody('Update Promotion'));
    const startsAt = new Date('2030-02-01T00:00:00.000Z').toISOString();
    const expiresAt = new Date('2030-02-10T00:00:00.000Z').toISOString();

    const updated = await updatePromotion(created.id, {
      code: `updated-code-${uniqueToken()}`,
      startsAt,
      expiresAt,
      minCartAmount: 2500,
      translations: [
        {
          languageCode: 'en',
          displayName: `Updated Promotion ${uniqueToken()}`,
          terms: 'Updated terms',
        },
      ],
    });

    expect(updated).not.toBeNull();
    expect(updated!.code).toMatch(/^UPDATED-CODE-/);
    expect(new Date(updated!.startsAt!).toISOString()).toBe(startsAt);
    expect(new Date(updated!.expiresAt!).toISOString()).toBe(expiresAt);
    expect(updated!.minCartAmount).toBe(2500);
    expect(updated!.translations[0].terms).toBe('Updated terms');
  });

  it('creates product and category targets', async () => {
    const productId = await createProductTarget();
    const categoryId = await createCategoryTarget();
    const created = await createPromotion(makeCreateBody('Targets'));

    const productTarget = await createPromotionTarget(created.id, { productId });
    const categoryTarget = await createPromotionTarget(created.id, { categoryId });
    const promotion = await getPromotion(created.id);

    expect(productTarget!.targetType).toBe('product');
    expect(categoryTarget!.targetType).toBe('category');
    expect(promotion!.targets).toHaveLength(2);
  });

  it('rejects invalid target references', async () => {
    const created = await createPromotion(makeCreateBody('Invalid Target'));

    await expect(
      createPromotionTarget(created.id, {
        productId: '11111111-1111-4111-8111-111111111111',
      })
    ).rejects.toBeInstanceOf(PromotionValidationError);
  });

  it('deletes a promotion', async () => {
    const created = await createPromotion(makeCreateBody('Delete Promotion'));

    await expect(deletePromotion(created.id)).resolves.toBe(true);
    await expect(getPromotion(created.id)).resolves.toBeNull();
  });
});
