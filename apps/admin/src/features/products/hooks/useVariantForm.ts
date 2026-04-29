import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ProductDetailVariant } from '@repo/types/admin';
import { variantFormSchema, type VariantFormValues } from '../schema';
import {
  DEFAULT_VARIANT_FORM_VALUES,
  getVariantFormValues,
} from '../utils/variant-form';

interface UseVariantFormOptions {
  resetOnVariantChange?: boolean;
}

export function useVariantForm(
  variant?: ProductDetailVariant | null,
  { resetOnVariantChange = true }: UseVariantFormOptions = {}
) {
  const defaultValues = useMemo(
    () =>
      variant
        ? getVariantFormValues(variant)
        : DEFAULT_VARIANT_FORM_VALUES,
    [variant]
  );

  const form = useForm<VariantFormValues, unknown, VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues,
  });

  const {
    fields: priceFields,
    append: appendPrice,
    remove: removePrice,
  } = useFieldArray({
    control: form.control,
    name: 'prices',
  });

  useEffect(() => {
    if (resetOnVariantChange) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, resetOnVariantChange]);

  return {
    appendPrice,
    defaultValues,
    form,
    priceFields,
    removePrice,
  };
}
