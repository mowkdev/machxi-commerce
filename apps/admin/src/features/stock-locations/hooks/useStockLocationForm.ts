import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import type { StockLocationDetail } from '@repo/types/admin';
import { useCreateStockLocation, useUpdateStockLocation } from '../hooks';
import { stockLocationFormSchema, type StockLocationFormValues } from '../schema';

interface UseStockLocationFormParams {
  mode: 'create' | 'edit';
  initialData?: StockLocationDetail;
}

export function useStockLocationForm({ mode, initialData }: UseStockLocationFormParams) {
  const navigate = useNavigate();
  const createMutation = useCreateStockLocation();
  const updateMutation = useUpdateStockLocation(initialData?.id ?? '');
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';

  const defaultValues = useMemo<StockLocationFormValues>(
    () => ({
      name: initialData?.name ?? '',
    }),
    [initialData]
  );

  const form = useForm<StockLocationFormValues, unknown, StockLocationFormValues>({
    resolver: zodResolver(stockLocationFormSchema),
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
  const title = isCreateMode ? 'New stock location' : form.watch('name') || 'Untitled';
  const navigateToStockLocations = () => navigate('/stock-locations');

  return {
    form,
    isCreateMode,
    isPending,
    navigateToStockLocations,
    onSubmit,
    title,
  };
}
