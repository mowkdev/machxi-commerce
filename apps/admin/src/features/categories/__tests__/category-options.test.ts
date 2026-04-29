import { describe, expect, it } from 'vitest';
import type { CategoryListItem } from '@repo/types/admin';
import { getCategoryLabel, getNextCategoryRank } from '../utils/category-options';

function category(overrides: Partial<CategoryListItem>): CategoryListItem {
  return {
    id: 'category-id',
    name: 'Category',
    handle: 'category',
    parentId: null,
    parentName: null,
    isActive: true,
    rank: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as CategoryListItem;
}

describe('getCategoryLabel', () => {
  it('returns the category name for root categories', () => {
    expect(getCategoryLabel(category({ name: 'T-shirts' }))).toBe('T-shirts');
  });

  it('includes the parent name for nested categories', () => {
    expect(
      getCategoryLabel(category({ name: 'T-shirts', parentName: 'Clothing' }))
    ).toBe('Clothing / T-shirts');
  });
});

describe('getNextCategoryRank', () => {
  it('starts root categories at rank 1', () => {
    expect(getNextCategoryRank([], null)).toBe(1);
  });

  it('uses the next sibling rank for the selected parent', () => {
    const categories = [
      category({ id: 'root-1', parentId: null, rank: 2 }),
      category({ id: 'child-1', parentId: 'parent-1', rank: 3 }),
      category({ id: 'child-2', parentId: 'parent-1', rank: 7 }),
      category({ id: 'child-3', parentId: 'parent-2', rank: 10 }),
    ];

    expect(getNextCategoryRank(categories, 'parent-1')).toBe(8);
  });

  it('excludes the edited category from sibling rank calculation', () => {
    const categories = [
      category({ id: 'category-1', parentId: 'parent-1', rank: 2 }),
      category({ id: 'category-2', parentId: 'parent-1', rank: 9 }),
    ];

    expect(getNextCategoryRank(categories, 'parent-1', 'category-2')).toBe(3);
  });
});
