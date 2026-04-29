import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiRequestError } from '@/lib/api';
import type {
  CreateProductBody,
  UpdateProductBody,
  UpdateVariantBody,
  GenerateVariantsBody,
  OptionCatalogOption,
  ProductDetailResponse,
} from '@repo/types/admin';
import {
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateVariant,
  generateVariants,
  listProductOptionsCatalog,
  productsKeys,
} from './api';

export function useProduct(id: string) {
  return useQuery<ProductDetailResponse, ApiRequestError>({
    queryKey: productsKeys.detail(id),
    queryFn: () => getProduct(id),
  });
}

export function useProductOptionsCatalog() {
  return useQuery<OptionCatalogOption[], ApiRequestError>({
    queryKey: productsKeys.optionsCatalog(),
    queryFn: () => listProductOptionsCatalog({ languageCode: 'en' }),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, ApiRequestError, CreateProductBody>({
    mutationFn: createProduct,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: productsKeys.list() });
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

  return useMutation<ProductDetailResponse, ApiRequestError, UpdateProductBody>({
    mutationFn: (body) => updateProduct(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(productsKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: productsKeys.list() });
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

  return useMutation<void, ApiRequestError, string>({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKeys.list() });
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
    ApiRequestError,
    { variantId: string; body: UpdateVariantBody }
  >({
    mutationFn: ({ variantId, body }) =>
      updateVariant(productId, variantId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKeys.detail(productId) });
      toast.success('Variant saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save variant');
    },
  });
}

export function useGenerateVariants(productId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ created: number }, ApiRequestError, GenerateVariantsBody>({
    mutationFn: (body) => generateVariants(productId, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: productsKeys.detail(productId) });
      toast.success(`${data.created} variant${data.created === 1 ? '' : 's'} generated`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate variants');
    },
  });
}
