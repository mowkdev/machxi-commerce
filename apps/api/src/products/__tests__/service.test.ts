import { describe, expect, it, beforeAll } from 'vitest';
import { db } from '@repo/database/client';
import { eq, inArray } from '@repo/database';
import {
  languages,
  media,
  productMedia,
  products,
  productVariants,
  taxClasses,
  variantMedia,
  variantOptionValues,
} from '@repo/database/schema';
import type { CreateProductBody, GenerateVariantsBody } from '@repo/types/admin';
import {
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  updateVariant,
  generateVariants,
} from '../service';

let taxClassId: string;

beforeAll(async () => {
  // Ensure a default language exists
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

  // Ensure a tax class exists
  const existingTaxClass = await db.select().from(taxClasses).limit(1);
  if (existingTaxClass.length > 0) {
    taxClassId = existingTaxClass[0].id;
  } else {
    const [tc] = await db
      .insert(taxClasses)
      .values({ name: 'Standard' })
      .returning({ id: taxClasses.id });
    taxClassId = tc.id;
  }
});

function makeCreateBody(overrides?: Partial<CreateProductBody>): CreateProductBody {
  const sku = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    type: 'simple',
    baseSku: sku,
    status: 'draft',
    taxClassId,
    translations: [
      {
        languageCode: 'en',
        name: `Test Product ${sku}`,
        description: 'A test product',
        handle: sku.toLowerCase(),
      },
    ],
    categoryIds: [],
    options: [],
    variants: [
      {
        sku,
        status: 'draft',
        optionValueIndices: [],
        prices: [
          {
            currencyCode: 'EUR',
            amount: 1999,
            minQuantity: 1,
            taxInclusive: true,
          },
        ],
      },
    ],
    ...overrides,
  };
}

function makeOption(
  name: string,
  values: string[]
): NonNullable<GenerateVariantsBody['options']>[number] {
  return {
    translations: [{ languageCode: 'en', name }],
    values: values.map((label) => ({
      translations: [{ languageCode: 'en', label }],
    })),
  };
}

async function createMediaRow(label: string) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${label}`;
  const [row] = await db
    .insert(media)
    .values({
      storageKey: `tests/products/${unique}.jpg`,
      url: `https://cdn.example.test/${unique}.jpg`,
      fileName: `${label}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 100,
      checksumSha256: unique.padEnd(64, '0').slice(0, 64),
      altText: label,
    })
    .returning({ id: media.id });
  return row.id;
}

describe('createProduct', () => {
  it('creates a product with translations, variants, and prices', async () => {
    const body = makeCreateBody();
    const result = await createProduct(body);

    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');

    const product = await getProduct(result.id);
    expect(product).not.toBeNull();
    expect(product!.translations).toHaveLength(1);
    expect(product!.translations[0].name).toBe(body.translations[0].name);
    expect(product!.variants).toHaveLength(1);
    expect(product!.variants[0].sku).toBe(body.variants[0].sku);
    expect(product!.variants[0].prices).toHaveLength(1);
    expect(product!.variants[0].prices[0].amount).toBe(1999);
  });

  it('auto-creates a default variant for simple products with no variants in body', async () => {
    const body = makeCreateBody({ variants: [] });
    const { id } = await createProduct(body);

    const product = await getProduct(id);
    expect(product!.type).toBe('simple');
    expect(product!.variants).toHaveLength(1);
    // default variant uses baseSku as sku
    expect(product!.variants[0].sku).toBe(body.baseSku);
    expect(product!.variants[0].prices).toHaveLength(1);
    expect(product!.variants[0].prices[0].currencyCode).toBe('EUR');
  });

  it('creates a variable product with no variants', async () => {
    const sku = `VAR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const body = makeCreateBody({
      type: 'variable',
      baseSku: sku,
      translations: [
        {
          languageCode: 'en',
          name: `Variable ${sku}`,
          handle: sku.toLowerCase(),
        },
      ],
      variants: [],
    });
    const { id } = await createProduct(body);

    const product = await getProduct(id);
    expect(product!.type).toBe('variable');
    expect(product!.variants).toHaveLength(0);
    expect(product!.options).toHaveLength(0);
  });

  it('creates a product with options', async () => {
    const body = makeCreateBody({
      options: [
        {
          translations: [{ languageCode: 'en', name: 'Color' }],
          values: [
            { translations: [{ languageCode: 'en', label: 'Red' }] },
            { translations: [{ languageCode: 'en', label: 'Blue' }] },
          ],
        },
      ],
      variants: [
        {
          sku: `TEST-RED-${Date.now()}`,
          status: 'draft',
          optionValueIndices: [[0, 0]],
          prices: [
            { currencyCode: 'EUR', amount: 2999, minQuantity: 1, taxInclusive: true },
          ],
        },
        {
          sku: `TEST-BLUE-${Date.now()}`,
          status: 'draft',
          optionValueIndices: [[0, 1]],
          prices: [
            { currencyCode: 'EUR', amount: 2999, minQuantity: 1, taxInclusive: true },
          ],
        },
      ],
    });

    const result = await createProduct(body);
    const product = await getProduct(result.id);

    expect(product!.options).toHaveLength(1);
    expect(product!.options[0].translations[0].name).toBe('Color');
    expect(product!.options[0].values).toHaveLength(2);
    expect(product!.variants).toHaveLength(2);
  });
});

describe('getProduct', () => {
  it('returns null for non-existent ID', async () => {
    const result = await getProduct('00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });

  it('returns full nested product detail', async () => {
    const { id } = await createProduct(makeCreateBody());
    const product = await getProduct(id);

    expect(product).not.toBeNull();
    expect(product!.id).toBe(id);
    expect(product!.status).toBe('draft');
    expect(product!.translations.length).toBeGreaterThanOrEqual(1);
    expect(product!.variants.length).toBeGreaterThanOrEqual(1);
  });
});

describe('updateProduct', () => {
  it('updates product-level fields without touching variants', async () => {
    const { id } = await createProduct(makeCreateBody());
    const before = await getProduct(id);
    const variantSku = before!.variants[0].sku;
    const handle = `updated-name-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    await updateProduct(id, {
      status: 'published',
      translations: [
        {
          languageCode: 'en',
          name: 'Updated Name',
          description: 'Updated description',
          handle,
        },
      ],
    });

    const after = await getProduct(id);
    expect(after!.status).toBe('published');
    expect(after!.translations[0].name).toBe('Updated Name');
    expect(after!.variants[0].sku).toBe(variantSku);
  });

  it('replaces product media and preserves submitted rank order', async () => {
    const { id } = await createProduct(makeCreateBody());
    const firstMediaId = await createMediaRow('product-first');
    const secondMediaId = await createMediaRow('product-second');

    await updateProduct(id, {
      media: [
        { mediaId: secondMediaId, rank: 0 },
        { mediaId: firstMediaId, rank: 1 },
      ],
    });

    const product = await getProduct(id);
    expect(product!.media.map((item) => item.mediaId)).toEqual([
      secondMediaId,
      firstMediaId,
    ]);
    expect(product!.media.map((item) => item.rank)).toEqual([0, 1]);

    await updateProduct(id, { media: [] });
    const cleared = await getProduct(id);
    expect(cleared!.media).toEqual([]);

    const rows = await db
      .select()
      .from(productMedia)
      .where(eq(productMedia.productId, id));
    expect(rows).toHaveLength(0);
  });
});

describe('deleteProduct', () => {
  it('soft-deletes a product', async () => {
    const { id } = await createProduct(makeCreateBody());
    const deleted = await deleteProduct(id);
    expect(deleted).toBe(true);

    const product = await getProduct(id);
    expect(product).toBeNull();

    // Verify it's still in DB with status 'deleted'
    const [raw] = await db
      .select({ status: products.status })
      .from(products)
      .where(eq(products.id, id));
    expect(raw.status).toBe('deleted');
  });

  it('returns false for non-existent product', async () => {
    const result = await deleteProduct('00000000-0000-0000-0000-000000000000');
    expect(result).toBe(false);
  });
});

describe('updateVariant', () => {
  it('updates variant fields and prices independently', async () => {
    const { id } = await createProduct(makeCreateBody());
    const product = await getProduct(id);
    const variantId = product!.variants[0].id;

    const updated = await updateVariant(id, variantId, {
      sku: `UPDATED-${Date.now()}`,
      weight: 500,
      status: 'published',
      prices: [
        { currencyCode: 'EUR', amount: 3999, minQuantity: 1, taxInclusive: true },
        { currencyCode: 'USD', amount: 4299, minQuantity: 1, taxInclusive: false },
      ],
    });
    expect(updated).toBe(true);

    const after = await getProduct(id);
    const variant = after!.variants[0];
    expect(variant.weight).toBe(500);
    expect(variant.status).toBe('published');
    expect(variant.prices).toHaveLength(2);
  });

  it('returns false for non-existent variant', async () => {
    const { id } = await createProduct(makeCreateBody());
    const result = await updateVariant(
      id,
      '00000000-0000-0000-0000-000000000000',
      { sku: 'nope' }
    );
    expect(result).toBe(false);
  });

  it('replaces variant media and preserves submitted rank order', async () => {
    const { id } = await createProduct(makeCreateBody());
    const product = await getProduct(id);
    const variantId = product!.variants[0].id;
    const firstMediaId = await createMediaRow('variant-first');
    const secondMediaId = await createMediaRow('variant-second');

    const updated = await updateVariant(id, variantId, {
      media: [
        { mediaId: secondMediaId, rank: 0 },
        { mediaId: firstMediaId, rank: 1 },
      ],
    });
    expect(updated).toBe(true);

    const after = await getProduct(id);
    expect(after!.variants[0].media.map((item) => item.mediaId)).toEqual([
      secondMediaId,
      firstMediaId,
    ]);
    expect(after!.variants[0].media.map((item) => item.rank)).toEqual([0, 1]);

    await updateVariant(id, variantId, { media: [] });
    const cleared = await getProduct(id);
    expect(cleared!.variants[0].media).toEqual([]);

    const rows = await db
      .select()
      .from(variantMedia)
      .where(eq(variantMedia.variantId, variantId));
    expect(rows).toHaveLength(0);
  });
});

describe('generateVariants', () => {
  it('generates cartesian product of option values', async () => {
    const body = makeCreateBody({
      options: [
        {
          translations: [{ languageCode: 'en', name: 'Color' }],
          values: [
            { translations: [{ languageCode: 'en', label: 'Red' }] },
            { translations: [{ languageCode: 'en', label: 'Blue' }] },
          ],
        },
        {
          translations: [{ languageCode: 'en', name: 'Size' }],
          values: [
            { translations: [{ languageCode: 'en', label: 'S' }] },
            { translations: [{ languageCode: 'en', label: 'M' }] },
            { translations: [{ languageCode: 'en', label: 'L' }] },
          ],
        },
      ],
      variants: [
        {
          sku: `SEED-${Date.now()}`,
          status: 'draft',
          optionValueIndices: [],
          prices: [
            { currencyCode: 'EUR', amount: 0, minQuantity: 1, taxInclusive: true },
          ],
        },
      ],
    });

    const { id } = await createProduct(body);

    const genBody: GenerateVariantsBody = {
      defaultPrices: [
        { currencyCode: 'EUR', amount: 2500, minQuantity: 1, taxInclusive: true },
      ],
      skuPrefix: `GEN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    const result = await generateVariants(id, genBody);
    expect(result.created).toBe(6); // 2 colors x 3 sizes

    const product = await getProduct(id);
    // 1 seed variant + 6 generated = 7
    expect(product!.variants.length).toBe(7);
  });

  it('is idempotent: running again creates 0 new variants', async () => {
    const body = makeCreateBody({
      options: [
        {
          translations: [{ languageCode: 'en', name: 'Material' }],
          values: [
            { translations: [{ languageCode: 'en', label: 'Cotton' }] },
            { translations: [{ languageCode: 'en', label: 'Poly' }] },
          ],
        },
      ],
      variants: [
        {
          sku: `SEED-IDEM-${Date.now()}`,
          status: 'draft',
          optionValueIndices: [],
          prices: [
            { currencyCode: 'EUR', amount: 0, minQuantity: 1, taxInclusive: true },
          ],
        },
      ],
    });

    const { id } = await createProduct(body);

    const genBody: GenerateVariantsBody = {
      defaultPrices: [],
      skuPrefix: `IDEM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    const first = await generateVariants(id, genBody);
    expect(first.created).toBe(2);

    const second = await generateVariants(id, genBody);
    expect(second.created).toBe(0);
  });

  it('persists submitted options before first variant generation', async () => {
    const { id } = await createProduct(
      makeCreateBody({ type: 'variable', options: [], variants: [] })
    );

    const result = await generateVariants(id, {
      defaultPrices: [
        { currencyCode: 'EUR', amount: 2500, minQuantity: 1, taxInclusive: true },
      ],
      skuPrefix: `FIRST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      options: [
        makeOption('Color', ['Red', 'Blue']),
        makeOption('Size', ['S', 'M']),
      ],
    });

    expect(result.created).toBe(4);

    const product = await getProduct(id);
    expect(product!.options).toHaveLength(2);
    expect(product!.variants).toHaveLength(4);
    expect(product!.variants.every((variant) => variant.optionValues.length === 2)).toBe(
      true
    );
  });

  it('regenerates variants after adding an option and removes old links', async () => {
    const { id } = await createProduct(
      makeCreateBody({ type: 'variable', options: [], variants: [] })
    );

    const prefix = `ADD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await generateVariants(id, {
      defaultPrices: [],
      skuPrefix: prefix,
      options: [makeOption('Color', ['Red', 'Blue'])],
    });

    const before = await getProduct(id);
    const oldVariantIds = before!.variants.map((variant) => variant.id);

    const result = await generateVariants(id, {
      defaultPrices: [],
      skuPrefix: prefix,
      regenerate: true,
      options: [
        makeOption('Color', ['Red', 'Blue']),
        makeOption('Size', ['S', 'M']),
      ],
    });

    expect(result.created).toBe(4);

    const product = await getProduct(id);
    expect(product!.options).toHaveLength(2);
    expect(product!.variants).toHaveLength(4);
    expect(product!.variants.every((variant) => variant.optionValues.length === 2)).toBe(
      true
    );
    expect(product!.variants.some((variant) => oldVariantIds.includes(variant.id))).toBe(
      false
    );

    const oldVariantRows = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(inArray(productVariants.id, oldVariantIds));
    const oldLinkRows = await db
      .select()
      .from(variantOptionValues)
      .where(inArray(variantOptionValues.variantId, oldVariantIds));

    expect(oldVariantRows).toHaveLength(0);
    expect(oldLinkRows).toHaveLength(0);
  });

  it('regenerates variants after deleting an option', async () => {
    const { id } = await createProduct(
      makeCreateBody({ type: 'variable', options: [], variants: [] })
    );

    const prefix = `DEL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await generateVariants(id, {
      defaultPrices: [],
      skuPrefix: prefix,
      options: [
        makeOption('Color', ['Red', 'Blue']),
        makeOption('Size', ['S', 'M']),
      ],
    });

    const result = await generateVariants(id, {
      defaultPrices: [],
      skuPrefix: prefix,
      regenerate: true,
      options: [makeOption('Color', ['Red', 'Blue'])],
    });

    expect(result.created).toBe(2);

    const product = await getProduct(id);
    expect(product!.options).toHaveLength(1);
    expect(product!.options[0].translations[0].name).toBe('Color');
    expect(product!.variants).toHaveLength(2);
    expect(product!.variants.every((variant) => variant.optionValues.length === 1)).toBe(
      true
    );
  });

  it('rejects duplicate submitted option definitions', async () => {
    const { id } = await createProduct(
      makeCreateBody({ type: 'variable', options: [], variants: [] })
    );

    await expect(
      generateVariants(id, {
        defaultPrices: [],
        skuPrefix: `DUP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        options: [
          makeOption('Color', ['Red']),
          makeOption('color', ['Blue']),
        ],
      })
    ).rejects.toThrow('Option definitions must be unique per product');
  });
});
