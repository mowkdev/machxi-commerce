import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import type { z } from 'zod';
import type { ProductDetailResponse } from '@repo/types/admin';
import { useCreateProduct, useUpdateProduct, useUpdateVariant } from '../hooks';
import {
  productFormSchema,
  type ProductFormValues,
} from '../schema';
import { getUpdateVariantBody } from '../utils/variant-form';
import {
  buildProductTranslationsMap,
  collectProductTranslations,
  emptyProductTranslation,
} from '../utils/translation-form';
import { useProductLocales } from './useProductLocales';
import { useVariantForm } from './useVariantForm';

interface UseProductFormParams {
  mode: 'create' | 'edit';
  initialData?: ProductDetailResponse;
}

type ProductFormInput = z.input<typeof productFormSchema>;

export function useProductForm({ mode, initialData }: UseProductFormParams) {
  const navigate = useNavigate();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(initialData?.id ?? '');
  const updateVariantMutation = useUpdateVariant(initialData?.id ?? '');

  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const { defaultLocale, languages, selectedLocale, setSelectedLocale } =
    useProductLocales(initialData);

  const defaultVariant = useMemo(
    () =>
      initialData?.variants.find((variant) => variant.optionValues.length === 0) ??
      initialData?.variants[0] ??
      null,
    [initialData]
  );

  const defaultValues = useMemo<ProductFormInput>(
    () => ({
      baseSku: initialData?.baseSku ?? '',
      status: (initialData?.status as ProductFormValues['status']) ?? 'draft',
      type: (initialData?.type as ProductFormValues['type']) ?? 'simple',
      taxClassId: initialData?.taxClassId ?? '',
      categoryIds: initialData?.categories.map((c) => c.categoryId) ?? [],
      translations: buildProductTranslationsMap(initialData, defaultLocale),
    }),
    [initialData, defaultLocale]
  );

  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  const {
    appendPrice: appendDefaultVariantPrice,
    form: defaultVariantForm,
    priceFields: defaultVariantPriceFields,
    removePrice: removeDefaultVariantPrice,
  } = useVariantForm(defaultVariant, { resetOnVariantChange: isEditMode });

  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset(defaultValues);
    }
  }, [initialData, isEditMode, form, defaultValues]);

  // Lazy-create a translation entry the first time a locale is selected.
  useEffect(() => {
    const current = form.getValues('translations');
    if (!current || !current[selectedLocale]) {
      form.setValue(
        `translations.${selectedLocale}`,
        emptyProductTranslation(),
        { shouldDirty: false }
      );
    }
  }, [selectedLocale, form]);

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

  function ensureActiveLocaleFilled(
    values: ProductFormValues,
    translations: ReturnType<typeof collectProductTranslations>
  ): boolean {
    const activeFields = values.translations[selectedLocale];
    if (!activeFields?.name.trim()) {
      form.setError(`translations.${selectedLocale}.name`, {
        type: 'required',
        message: 'Product name is required',
      });
    }
    if (!activeFields?.handle.trim()) {
      form.setError(`translations.${selectedLocale}.handle`, {
        type: 'required',
        message: 'Handle is required',
      });
    }
    if (!activeFields?.name.trim() || !activeFields?.handle.trim()) return false;

    if (translations.length === 0) {
      form.setError(`translations.${selectedLocale}.name`, {
        type: 'required',
        message: 'Product name is required',
      });
      return false;
    }

    return true;
  }

  function submitCreate(values: ProductFormValues, translations: ReturnType<typeof collectProductTranslations>) {
    createMutation.mutate({
      type: values.type,
      baseSku: values.baseSku || undefined,
      status: values.status,
      taxClassId: values.taxClassId,
      translations,
      categoryIds: values.categoryIds,
      options: [],
      variants: [],
    });
  }

  async function submitEdit(values: ProductFormValues, translations: ReturnType<typeof collectProductTranslations>) {
    if (isDefaultVariantDirty) {
      const isDefaultVariantValid = await defaultVariantForm.trigger();
      if (!isDefaultVariantValid) return;
    }

    if (isProductDirty) {
      updateMutation.mutate(
        {
          baseSku: values.baseSku || undefined,
          status: values.status,
          taxClassId: values.taxClassId,
          translations,
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

  const onSubmit = form.handleSubmit(async (values) => {
    if (!canSave) return;

    const translations = collectProductTranslations(values);
    if (!ensureActiveLocaleFilled(values, translations)) return;

    if (isCreateMode) return submitCreate(values, translations);
    await submitEdit(values, translations);
  });

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    updateVariantMutation.isPending;
  // Title always reflects the default-language name so the page header is a
  // stable product identity, independent of which locale the editor is on.
  const defaultName = form.watch(`translations.${defaultLocale}.name` as const);
  const title = isCreateMode
    ? 'New product'
    : defaultName || 'Untitled product';
  const hasOptions = (initialData?.options.length ?? 0) > 0;
  const navigateToProducts = () => navigate('/products');

  return {
    appendDefaultVariantPrice,
    canSave,
    defaultLocale,
    defaultVariant,
    defaultVariantForm,
    defaultVariantPriceFields,
    form,
    hasOptions,
    isCreateMode,
    isEditMode,
    isPending,
    isVariable,
    languages,
    navigateToProducts,
    onSubmit,
    removeDefaultVariantPrice,
    selectedLocale,
    setSelectedLocale,
    title,
  };
}
