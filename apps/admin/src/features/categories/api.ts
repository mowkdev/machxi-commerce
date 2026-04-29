import { api } from '@/lib/api';
import type { DataGridQueryParams, DataGridResponse } from '@/components/app-data-grid';
import type {
  CategoryDetail,
  CategoryListItem,
  CreateCategoryBody,
  UpdateCategoryBody,
} from '@repo/types/admin';

export async function listCategories(
  params: DataGridQueryParams
): Promise<DataGridResponse<CategoryListItem>> {
  const query: Record<string, string> = {
    page: String(params.page),
    pageSize: String(params.pageSize),
  };
  if (params.search) query.search = params.search;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  for (const [key, value] of Object.entries(params.filters)) {
    if (value !== undefined && value !== '') {
      query[key] = value;
    }
  }

  const res = await api.get<DataGridResponse<CategoryListItem>>('/api/categories', {
    params: query,
  });
  return res.data;
}

export async function getCategory(id: string): Promise<CategoryDetail> {
  const res = await api.get<CategoryDetail>(`/api/categories/${id}`);
  return res.data;
}

export async function createCategory(
  body: CreateCategoryBody
): Promise<{ id: string }> {
  const res = await api.post<{ id: string }>('/api/categories', body);
  return res.data;
}

export async function updateCategory(
  id: string,
  body: UpdateCategoryBody
): Promise<CategoryDetail> {
  const res = await api.put<CategoryDetail>(`/api/categories/${id}`, body);
  return res.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/api/categories/${id}`);
}

export async function listAllCategories(): Promise<CategoryListItem[]> {
  const res = await api.get<DataGridResponse<CategoryListItem>>('/api/categories', {
    params: { pageSize: '200', sortBy: 'name', sortOrder: 'asc' },
  });
  return res.data.data;
}

export const categoriesKeys = {
  all: ['categories'] as const,
  list: () => [...categoriesKeys.all, 'list'] as const,
  detail: (id: string) => [...categoriesKeys.all, 'detail', id] as const,
  options: () => [...categoriesKeys.all, 'options'] as const,
};
