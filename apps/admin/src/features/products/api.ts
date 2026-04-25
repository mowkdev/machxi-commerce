import { api } from '@/lib/api';
import type { DataGridQueryParams, DataGridResponse } from '@/components/app-data-grid';

export interface ProductListItem {
  id: string;
  baseSku: string | null;
  status: 'draft' | 'published' | 'archived' | 'deleted';
  name: string | null;
  handle: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listProducts(
  params: DataGridQueryParams
): Promise<DataGridResponse<ProductListItem>> {
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

  const res = await api.get<DataGridResponse<ProductListItem>>('/api/products', {
    params: query,
  });
  return res.data;
}

export const productsKeys = {
  all: ['products'] as const,
  list: () => [...productsKeys.all, 'list'] as const,
};
