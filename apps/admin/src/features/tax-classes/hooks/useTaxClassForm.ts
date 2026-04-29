import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import type { TaxClassDetail } from '@repo/types/admin';
import { useCreateTaxClass, useUpdateTaxClass } from '../hooks';
import { taxClassFormSchema, type TaxClassFormValues } from '../schema';

interface UseTaxClassFormParams {
  mode: 'create' | 'edit';
  initialData?: TaxClassDetail;
}

export function useTaxClassForm({ mode, initialData }: UseTaxClassFormParams) {
  const navigate = useNavigate();
  const createMutation = useCreateTaxClass();
  const updateMutation = useUpdateTaxClass(initialData?.id ?? '');
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';

  const defaultValues = useMemo<TaxClassFormValues>(
    () => ({
      name: initialData?.name ?? '',
    }),
    [initialData]
  );

  const form = useForm<TaxClassFormValues, unknown, TaxClassFormValues>({
    resolver: zodResolver(taxClassFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset(defaultValues);
    }
  }, [initialData, isEditMode, form, defaultValues]);

  const onSubmit = form.handleSubmit((values) => {
    if (isCreateMode) {
      createMutation.mutate({ name: values.name });
    } else {
      updateMutation.mutate({ name: values.name });
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const title = isCreateMode ? 'New tax class' : form.watch('name') || 'Untitled';
  const navigateToTaxClasses = () => navigate('/tax-classes');

  return {
    form,
    isCreateMode,
    isPending,
    navigateToTaxClasses,
    onSubmit,
    title,
  };
}
