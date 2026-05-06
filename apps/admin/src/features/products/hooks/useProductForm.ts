import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import type { z } from 'zod';
import type { ProductDetailResponse } from '@repo/types/admin';
import { useLanguageOptions } from '@/features/languages/hooks';
import { useCreateProduct, useUpdateProduct, useUpdateVariant } from '../hooks';
import {
  productFormSchema,
  type ProductFormValues,
} from '../schema';
import { getUpdateVariantBody } from '../utils/variant-form';
import { useVariantForm } from './useVariantForm';

interface UseProductFormParams {
  mode: 'create' | 'edit';
  initialData?: ProductDetailResponse;
}

type ProductFormInput = z.input<typeof productFormSchema>;

const FALLBACK_LOCALE = 'en';

function emptyTranslation(): { name: string; handle: string; description: string } {
  return { name: '', handle: '', description: '' };
}

function buildTranslationsMap(
  data: ProductDetailResponse | undefined,
  fallbackLocale: string
): Record<string, { name: string; handle: string; description: string }> {
  const result: Record<string, { name: string; handle: string; description: string }> = {};
  if (data) {
    for (const t of data.translations) {
      result[t.languageCode] = {
        name: t.name ?? '',
        handle: t.handle ?? '',
        description: t.description ?? '',
      };
    }
  }
  if (!result[fallbackLocale]) {
    result[fallbackLocale] = emptyTranslation();
  }
  return result;
}

export function useProductForm({ mode, initialData }: UseProductFormParams) {
  const navigate = useNavigate();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(initialData?.id ?? '');
  const updateVariantMutation = useUpdateVariant(initialData?.id ?? '');
  const { data: languages } = useLanguageOptions();

  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const defaultLocale = useMemo(() => {
    const fromApi = languages?.find((l) => l.isDefault)?.code ?? languages?.[0]?.code;
    const fromData = initialData?.translations[0]?.languageCode;
    return fromApi ?? fromData ?? FALLBACK_LOCALE;
  }, [languages, initialData]);

  const [selectedLocale, setSelectedLocale] = useState<string>(defaultLocale);

  // Sync selected locale once languages or initialData arrive.
  useEffect(() => {
    setSelectedLocale(defaultLocale);
  }, [defaultLocale]);

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
      translations: buildTranslationsMap(initialData, defaultLocale),
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
        emptyTranslation(),
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

  function collectTranslations(values: ProductFormValues) {
    return Object.entries(values.translations)
      .map(([languageCode, fields]) => ({
        languageCode,
        name: fields.name.trim(),
        handle: fields.handle.trim(),
        description: fields.description ?? '',
      }))
      .filter((t) => t.name.length > 0 && t.handle.length > 0);
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!canSave) return;

    const translations = collectTranslations(values);
    const activeFields = values.translations[selectedLocale];
    const activeMissing =
      !activeFields?.name.trim() || !activeFields?.handle.trim();
    if (activeMissing) {
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
      return;
    }

    if (translations.length === 0) {
      form.setError(`translations.${selectedLocale}.name`, {
        type: 'required',
        message: 'Product name is required',
      });
      return;
    }

    if (isCreateMode) {
      // The server auto-creates sale details for simple products. Options and
      // generated combinations are managed after creation.
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
  });

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    updateVariantMutation.isPending;
  const activeName = form.watch(`translations.${selectedLocale}.name` as const);
  const title = isCreateMode
    ? 'New product'
    : activeName || 'Untitled product';
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
    languages: languages ?? [],
    navigateToProducts,
    onSubmit,
    removeDefaultVariantPrice,
    selectedLocale,
    setSelectedLocale,
    title,
  };
}
