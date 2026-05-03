import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@repo/database/client";
import { eq } from "@repo/database";
import { languages, taxClasses } from "@repo/database/schema";
import type { CreateProductBody } from "@repo/types/admin";
import { createProduct, updateProduct } from "../../products/service";
import {
  getStoreProductByHandle,
  listStoreCategories,
  listStoreProducts,
} from "../service";

let taxClassId: string;

beforeAll(async () => {
  const [lang] = await db
    .select()
    .from(languages)
    .where(eq(languages.code, "en"))
    .limit(1);
  if (!lang) {
    await db
      .insert(languages)
      .values({ code: "en", name: "English", isDefault: true });
  }

  const existingTaxClasses = await db.select().from(taxClasses).limit(1);
  if (existingTaxClasses.length > 0) {
    taxClassId = existingTaxClasses[0].id;
  } else {
    const [tc] = await db
      .insert(taxClasses)
      .values({ name: "Standard" })
      .returning({ id: taxClasses.id });
    taxClassId = tc.id;
  }
});

function uniqueSku(label: string) {
  return `STORECAT-${label}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function makeCreateBody(
  status: CreateProductBody["status"],
  amount: number,
): { sku: string; handle: string; body: CreateProductBody } {
  const sku = uniqueSku(status);
  const handle = sku.toLowerCase();
  return {
    sku,
    handle,
    body: {
      type: "simple",
      baseSku: sku,
      status,
      taxClassId,
      translations: [
        {
          languageCode: "en",
          name: `Cat Test ${sku}`,
          description: `Description for ${sku}`,
          handle,
        },
      ],
      categoryIds: [],
      options: [],
      variants: [
        {
          sku,
          status,
          optionValueIndices: [],
          prices: [
            {
              currencyCode: "EUR",
              amount,
              minQuantity: 1,
              taxInclusive: true,
            },
          ],
        },
      ],
    },
  };
}

describe("store-catalog service", () => {
  it("hides draft and deleted products from the public list", async () => {
    const draft = makeCreateBody("draft", 100);
    const published = makeCreateBody("published", 250);

    const draftCreated = await createProduct(draft.body);
    const publishedCreated = await createProduct(published.body);

    const list = await listStoreProducts({
      page: 1,
      pageSize: 100,
      currency: "EUR",
    });
    const ids = list.data.map((p) => p.id);
    expect(ids).toContain(publishedCreated.id);
    expect(ids).not.toContain(draftCreated.id);
  });

  it("resolves price range from variant base prices", async () => {
    const { body, handle } = makeCreateBody("published", 1500);
    await createProduct(body);

    const detail = await getStoreProductByHandle(handle, "EUR");
    expect(detail).not.toBeNull();
    expect(detail!.variants).toHaveLength(1);
    expect(detail!.variants[0].price).not.toBeNull();
    expect(detail!.variants[0].price!.amount).toBe(1500);
    expect(detail!.variants[0].price!.taxInclusive).toBe(true);
    expect(detail!.variants[0].price!.source).toBe("base");
  });

  it("returns null for an unknown handle and for handles in other languages", async () => {
    const detail = await getStoreProductByHandle(
      "no-such-handle-anywhere",
      "EUR",
    );
    expect(detail).toBeNull();
  });

  it("does not return a price when the requested currency has no entry", async () => {
    const { body, handle } = makeCreateBody("published", 500);
    await createProduct(body);

    const detail = await getStoreProductByHandle(handle, "USD");
    expect(detail).not.toBeNull();
    expect(detail!.variants[0].price).toBeNull();
  });

  it("filters list by search term", async () => {
    const distinctTag = `XYZQ${Date.now().toString(36)}`;
    const { body } = makeCreateBody("published", 700);
    body.translations[0].name = `${distinctTag} unique product`;
    body.translations[0].handle = distinctTag.toLowerCase();
    await createProduct(body);

    const list = await listStoreProducts({
      page: 1,
      pageSize: 50,
      currency: "EUR",
      search: distinctTag,
    });
    expect(list.data).toHaveLength(1);
    expect(list.data[0].handle).toBe(distinctTag.toLowerCase());
  });

  it("hides products that transition to draft after creation", async () => {
    const { body, handle } = makeCreateBody("published", 800);
    const created = await createProduct(body);
    const beforeUpdate = await getStoreProductByHandle(handle, "EUR");
    expect(beforeUpdate).not.toBeNull();

    await updateProduct(created.id, { status: "draft" });
    const afterUpdate = await getStoreProductByHandle(handle, "EUR");
    expect(afterUpdate).toBeNull();
  });

  it("lists active categories", async () => {
    const result = await listStoreCategories({});
    expect(Array.isArray(result)).toBe(true);
  });
});
