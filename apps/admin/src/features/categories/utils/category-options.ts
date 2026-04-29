import type { CategoryListItem } from '@repo/types/admin';

export function getCategoryLabel(category: CategoryListItem) {
  return category.parentName
    ? `${category.parentName} / ${category.name}`
    : category.name;
}

export function getNextCategoryRank(
  categories: CategoryListItem[],
  parentId: string | null,
  excludeId?: string
) {
  const siblingRanks = categories
    .filter((category) => category.id !== excludeId && category.parentId === parentId)
    .map((category) => category.rank);

  return siblingRanks.length === 0 ? 1 : Math.max(...siblingRanks) + 1;
}
