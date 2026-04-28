import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import type { ProductDetailResponse } from '@repo/types/admin';
import { useCreateProduct, useUpdateProduct, useUpdateVariant } from '../hooks';
import {
  productFormSchema,
  variantFormSchema,
  type ProductFormValues,
  type VariantFormValues,
} from '../schema';
import {
  DEFAULT_VARIANT_FORM_VALUES,
  getUpdateVariantBody,
  getVariantFormValues,
} from '../utils/variant-form';

interface UseProductFormParams {
  mode: 'create' | 'edit';
  initialData?: ProductDetailResponse;
}

export function useProductForm({ mode, initialData }: UseProductFormParams) {
  const navigate = useNavigate();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(initialData?.id ?? '');
  const updateVariantMutation = useUpdateVariant(initialData?.id ?? '');

  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';
  const defaultTranslation = initialData?.translations[0];
  const defaultVariant = useMemo(
    () =>
      initialData?.variants.find((variant) => variant.optionValues.length === 0) ??
      initialData?.variants[0] ??
      null,
    [initialData]
  );

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

  const defaultVariantValues = useMemo(
    () =>
      defaultVariant
        ? getVariantFormValues(defaultVariant)
        : DEFAULT_VARIANT_FORM_VALUES,
    [defaultVariant]
  );

  const defaultVariantForm = useForm<
    VariantFormValues,
    unknown,
    VariantFormValues
  >({
    resolver: zodResolver(variantFormSchema),
    defaultValues: defaultVariantValues,
  });

  const {
    fields: defaultVariantPriceFields,
    append: appendDefaultVariantPrice,
    remove: removeDefaultVariantPrice,
  } = useFieldArray({
    control: defaultVariantForm.control,
    name: 'prices',
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset(defaultValues);
    }
  }, [initialData, isEditMode, form, defaultValues]);

  useEffect(() => {
    if (isEditMode) {
      defaultVariantForm.reset(defaultVariantValues);
    }
  }, [defaultVariantForm, defaultVariantValues, isEditMode]);

  const productType = form.watch('type');
  const isVariable = productType === 'variable';
  const shouldIncludeDefaultVariant =
    isEditMode && !isVariable && Boolean(defaultVariant);
  const isProductDirty = form.formState.isDirty;
  const isDefaultVariantDirty =
    shouldIncludeDefaultVariant && defaultVariantForm.formState.isDirty;
  const canSave = isCreateMode
    ? isProductDirty
    : isProductDirty || isDefaultVariantDirty;

  const onSubmit = form.handleSubmit(async (values) => {
    if (!canSave) return;

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
      if (isDefaultVariantDirty) {
        const isDefaultVariantValid = await defaultVariantForm.trigger();
        if (!isDefaultVariantValid) return;
      }

      // Product type is immutable post-create and intentionally omitted.
      if (isProductDirty) {
        updateMutation.mutate(
          {
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
          },
          {
            onSuccess: () => {
              form.reset(values);
            },
          }
        );
      }

      if (isDefaultVariantDirty && defaultVariant) {
        const variantValues = defaultVariantForm.getValues();
        updateVariantMutation.mutate(
          {
            variantId: defaultVariant.id,
            body: getUpdateVariantBody(variantValues),
          },
          {
            onSuccess: () => {
              defaultVariantForm.reset(variantValues);
            },
          }
        );
      }
    }
  });

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    updateVariantMutation.isPending;
  const title = isCreateMode
    ? 'New product'
    : form.watch('name') || 'Untitled product';
  const hasOptions = (initialData?.options.length ?? 0) > 0;
  const navigateToProducts = () => navigate('/products');

  return {
    appendDefaultVariantPrice,
    canSave,
    defaultVariant,
    defaultVariantForm,
    defaultVariantPriceFields,
    form,
    hasOptions,
    isCreateMode,
    isEditMode,
    isPending,
    isVariable,
    navigateToProducts,
    onSubmit,
    removeDefaultVariantPrice,
    title,
  };
}
