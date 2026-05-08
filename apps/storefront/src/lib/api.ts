import {
  storeGetProductByHandle,
  storeListCategories,
  storeListProducts,
} from '@repo/storefront-sdk';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? 'EUR';

export async function fetchProducts(params: {
  currency?: string;
  page?: number;
  pageSize?: number;
  categoryHandle?: string;
  search?: string;
}) {
  return storeListProducts(
    {
      currency: params.currency ?? DEFAULT_CURRENCY,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 12,
      categoryHandle: params.categoryHandle,
      search: params.search,
    },
    { baseURL }
  );
}

export async function fetchProductByHandle(handle: string, currency?: string) {
  return storeGetProductByHandle(
    handle,
    { currency: currency ?? DEFAULT_CURRENCY },
    { baseURL }
  );
}

export async function fetchCategories() {
  return storeListCategories({}, { baseURL });
}
