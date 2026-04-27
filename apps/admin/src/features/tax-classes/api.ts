import { api } from '@/lib/api';
import type { DataGridQueryParams, DataGridResponse } from '@/components/app-data-grid';
import type {
  CreateTaxClassBody,
  UpdateTaxClassBody,
  TaxClassDetail,
} from '@repo/types/admin';

export interface TaxClassListItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export async function listTaxClasses(
  params: DataGridQueryParams
): Promise<DataGridResponse<TaxClassListItem>> {
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

  const res = await api.get<DataGridResponse<TaxClassListItem>>('/api/tax-classes', {
    params: query,
  });
  return res.data;
}

export async function getTaxClass(id: string): Promise<TaxClassDetail> {
  const res = await api.get<TaxClassDetail>(`/api/tax-classes/${id}`);
  return res.data;
}

export async function createTaxClass(
  body: CreateTaxClassBody
): Promise<{ id: string }> {
  const res = await api.post<{ id: string }>('/api/tax-classes', body);
  return res.data;
}

export async function updateTaxClass(
  id: string,
  body: UpdateTaxClassBody
): Promise<TaxClassDetail> {
  const res = await api.put<TaxClassDetail>(`/api/tax-classes/${id}`, body);
  return res.data;
}

export async function deleteTaxClass(id: string): Promise<void> {
  await api.delete(`/api/tax-classes/${id}`);
}

export async function listAllTaxClasses(): Promise<TaxClassListItem[]> {
  const res = await api.get<DataGridResponse<TaxClassListItem>>('/api/tax-classes', {
    params: { pageSize: '200' },
  });
  return res.data.data;
}

export const taxClassesKeys = {
  all: ['tax-classes'] as const,
  list: () => [...taxClassesKeys.all, 'list'] as const,
  detail: (id: string) => [...taxClassesKeys.all, 'detail', id] as const,
  options: () => [...taxClassesKeys.all, 'options'] as const,
};
