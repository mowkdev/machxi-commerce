import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '@repo/database/client';
import { eq } from '@repo/database';
import { languages } from '@repo/database/schema';
import type { CreateCategoryBody } from '@repo/types/admin';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
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

function uniqueRank() {
  return Math.floor(Math.random() * 1000000000);
}

function makeCreateBody(
  label: string,
  overrides?: Partial<CreateCategoryBody>
): CreateCategoryBody {
  const token = uniqueToken();

  return {
    parentId: null,
    isActive: true,
    rank: uniqueRank(),
    translations: [
      {
        languageCode: 'en',
        name: `${label} ${token}`,
        description: `${label} description`,
        handle: `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${token}`,
      },
    ],
    ...overrides,
  };
}

describe('category service', () => {
  it('creates and retrieves a category with translations', async () => {
    const body = makeCreateBody('Test Category');
    const result = await createCategory(body);

    const category = await getCategory(result.id);

    expect(category).not.toBeNull();
    expect(category!.parentId).toBeNull();
    expect(category!.isActive).toBe(true);
    expect(category!.rank).toBe(body.rank);
    expect(category!.translations).toHaveLength(1);
    expect(category!.translations[0].name).toBe(body.translations[0].name);
  });

  it('lists categories with search and pagination metadata', async () => {
    const body = makeCreateBody('Searchable Category');
    await createCategory(body);

    const result = await listCategories({
      page: 1,
      pageSize: 20,
      search: body.translations[0].handle,
      languageCode: 'en',
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(result.meta.totalItems).toBeGreaterThanOrEqual(1);
    expect(result.data.some((category) => category.handle === body.translations[0].handle)).toBe(
      true
    );
  });

  it('updates hierarchy and translation fields', async () => {
    const parent = await createCategory(makeCreateBody('Parent Category'));
    const child = await createCategory(makeCreateBody('Child Category'));
    const updatedName = `Updated Child ${uniqueToken()}`;
    const updatedHandle = updatedName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const updated = await updateCategory(child.id, {
      parentId: parent.id,
      isActive: false,
      rank: uniqueRank(),
      translations: [
        {
          languageCode: 'en',
          name: updatedName,
          description: 'Updated description',
          handle: updatedHandle,
        },
      ],
    });

    expect(updated).not.toBeNull();
    expect(updated!.parentId).toBe(parent.id);
    expect(updated!.parentName).toContain('Parent Category');
    expect(updated!.isActive).toBe(false);
    expect(updated!.translations[0].name).toBe(updatedName);
  });

  it('assigns the next root rank when rank is omitted', async () => {
    const firstBody = makeCreateBody('Auto Rank First');
    const secondBody = makeCreateBody('Auto Rank Second');
    delete firstBody.rank;
    delete secondBody.rank;

    const first = await createCategory(firstBody);
    const second = await createCategory(secondBody);

    const firstCategory = await getCategory(first.id);
    const secondCategory = await getCategory(second.id);

    expect(firstCategory!.rank).toBeGreaterThan(0);
    expect(secondCategory!.rank).toBe(firstCategory!.rank + 1);
  });

  it('deletes a category', async () => {
    const category = await createCategory(makeCreateBody('Delete Category'));

    await expect(deleteCategory(category.id)).resolves.toBe(true);
    await expect(getCategory(category.id)).resolves.toBeNull();
  });

  it('rejects duplicate handles in the same language', async () => {
    const first = makeCreateBody('Duplicate Category');
    await createCategory(first);

    const duplicate = makeCreateBody('Duplicate Category', {
      translations: [
        {
          ...first.translations[0],
          name: `Duplicate Name ${uniqueToken()}`,
        },
      ],
    });

    await expect(createCategory(duplicate)).rejects.toBeTruthy();
  });
});
