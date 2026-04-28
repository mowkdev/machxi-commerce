import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import type { ProductDetailResponse } from '@repo/types/admin';
import { useCreateProduct, useUpdateProduct } from '../hooks';
import { productFormSchema, type ProductFormValues } from '../schema';

interface UseProductFormParams {
  mode: 'create' | 'edit';
  initialData?: ProductDetailResponse;
}

export function useProductForm({ mode, initialData }: UseProductFormParams) {
  const navigate = useNavigate();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(initialData?.id ?? '');

  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';
  const defaultTranslation = initialData?.translations[0];

  const defaultValues = useMemo<ProductFormValues>(
    () => ({
      name: defaultTranslation?.name ?? '',
      handle: defaultTranslation?.handle ?? '',
      description: defaultTranslation?.description ?? '',
      baseSku: initialData?.baseSku ?? '',
      status: (initialData?.status as ProductFormValues['status']) ?? 'draft',
      type: (initialData?.type as ProductFormValues['type']) ?? 'simple',
      taxClassId: initialData?.taxClassId ?? '',
      categoryIds: initialData?.categories.map((c) => c.categoryId) ?? [],
    }),
    [initialData, defaultTranslation]
  );

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset(defaultValues);
    }
  }, [initialData, isEditMode, form, defaultValues]);

  const onSubmit = form.handleSubmit((values) => {
    const languageCode = defaultTranslation?.languageCode ?? 'en';

    if (isCreateMode) {
      // The server auto-creates sale details for simple products. Options and
      // generated combinations are managed after creation.
      createMutation.mutate({
        type: values.type,
        baseSku: values.baseSku || undefined,
        status: values.status,
        taxClassId: values.taxClassId,
        translations: [
          {
            languageCode,
            name: values.name,
            description: values.description,
            handle: values.handle,
          },
        ],
        categoryIds: values.categoryIds,
        options: [],
        variants: [],
      });
    } else {
      // Product type is immutable post-create and intentionally omitted.
      updateMutation.mutate({
        baseSku: values.baseSku || undefined,
        status: values.status,
        taxClassId: values.taxClassId,
        translations: [
          {
            languageCode,
            name: values.name,
            description: values.description,
            handle: values.handle,
          },
        ],
        categoryIds: values.categoryIds,
      });
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const title = isCreateMode
    ? 'New product'
    : form.watch('name') || 'Untitled product';
  const hasOptions = (initialData?.options.length ?? 0) > 0;
  const productType = form.watch('type');
  const isVariable = productType === 'variable';
  const navigateToProducts = () => navigate('/products');

  return {
    form,
    hasOptions,
    isCreateMode,
    isEditMode,
    isPending,
    isVariable,
    navigateToProducts,
    onSubmit,
    title,
  };
}
