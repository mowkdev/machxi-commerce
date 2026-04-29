import { api } from '@/lib/api';
import type { DataGridQueryParams, DataGridResponse } from '@/components/app-data-grid';
import type {
  CreateProductBody,
  UpdateProductBody,
  UpdateVariantBody,
  GenerateVariantsBody,
  OptionCatalogOption,
  ProductDetailResponse,
  ProductType,
} from '@repo/types/admin';

export interface ProductListItem {
  id: string;
  baseSku: string | null;
  status: 'draft' | 'published' | 'archived' | 'deleted';
  type: ProductType;
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

export async function getProduct(id: string): Promise<ProductDetailResponse> {
  const res = await api.get<ProductDetailResponse>(`/api/products/${id}`);
  return res.data;
}

export async function createProduct(
  body: CreateProductBody
): Promise<{ id: string }> {
  const res = await api.post<{ id: string }>('/api/products', body);
  return res.data;
}

export async function updateProduct(
  id: string,
  body: UpdateProductBody
): Promise<ProductDetailResponse> {
  const res = await api.put<ProductDetailResponse>(`/api/products/${id}`, body);
  return res.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/api/products/${id}`);
}

export async function updateVariant(
  productId: string,
  variantId: string,
  body: UpdateVariantBody
): Promise<void> {
  await api.patch(`/api/products/${productId}/variants/${variantId}`, body);
}

export async function generateVariants(
  productId: string,
  body: GenerateVariantsBody
): Promise<{ created: number }> {
  const res = await api.post<{ created: number }>(
    `/api/products/${productId}/variants/generate`,
    body
  );
  return res.data;
}

export async function listProductOptionsCatalog(params?: {
  search?: string;
  languageCode?: string;
}): Promise<OptionCatalogOption[]> {
  const res = await api.get<OptionCatalogOption[]>('/api/products/options', {
    params,
  });
  return res.data;
}

export const productsKeys = {
  all: ['products'] as const,
  list: () => [...productsKeys.all, 'list'] as const,
  detail: (id: string) => [...productsKeys.all, 'detail', id] as const,
  optionsCatalog: () => [...productsKeys.all, 'options-catalog'] as const,
};
