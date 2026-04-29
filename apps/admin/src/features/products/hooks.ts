import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  SdkRequestError,
  adminCreateProduct,
  adminDeleteProduct,
  adminGenerateVariants,
  adminUpdateProduct,
  adminUpdateVariant,
  useAdminGetProduct,
  useAdminListProductOptions,
} from '@repo/admin-sdk';
import type {
  CreateProductBody,
  GenerateVariantsBody,
  OptionCatalogOption,
  ProductDetailResponse,
  UpdateProductBody,
  UpdateVariantBody,
} from '@repo/types/admin';

export const productsQueryPrefix = [{ url: '/api/products' }] as const;

export function useProduct(id: string) {
  return useAdminGetProduct<ProductDetailResponse>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data,
    },
  });
}

export function useProductOptionsCatalog() {
  return useAdminListProductOptions<OptionCatalogOption[]>(
    { languageCode: 'en' },
    {
      query: {
        select: (response) => response.data,
      },
    }
  );
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, SdkRequestError, CreateProductBody>({
    mutationFn: async (body) => {
      const res = await adminCreateProduct(body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: productsQueryPrefix });
      toast.success('Product created');
      navigate(`/products/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create product');
    },
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();

  return useMutation<
    ProductDetailResponse,
    SdkRequestError,
    UpdateProductBody
  >({
    mutationFn: async (body) => {
      const res = await adminUpdateProduct(id, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryPrefix });
      toast.success('Product saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save product');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (id) => {
      await adminDeleteProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryPrefix });
      toast.success('Product deleted');
      navigate('/products');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });
}

export function useUpdateVariant(productId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    SdkRequestError,
    { variantId: string; body: UpdateVariantBody }
  >({
    mutationFn: async ({ variantId, body }) => {
      await adminUpdateVariant(productId, variantId, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryPrefix });
      toast.success('Variant saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save variant');
    },
  });
}

export function useGenerateVariants(productId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { created: number },
    SdkRequestError,
    GenerateVariantsBody
  >({
    mutationFn: async (body) => {
      const res = await adminGenerateVariants(productId, body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: productsQueryPrefix });
      toast.success(
        `${data.created} variant${data.created === 1 ? '' : 's'} generated`
      );
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate variants');
    },
  });
}
