import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import type { PriceListDetail } from '@repo/types/admin';
import { useCreatePriceList, useUpdatePriceList } from '../hooks';
import { priceListFormSchema, toApiDate, type PriceListFormValues } from '../schema';

interface UsePriceListFormParams {
  mode: 'create' | 'edit';
  initialData?: PriceListDetail;
}

function toDateTimeLocalValue(value: string | null | undefined) {
  return value ? value.slice(0, 16) : '';
}

export function usePriceListForm({ mode, initialData }: UsePriceListFormParams) {
  const navigate = useNavigate();
  const createMutation = useCreatePriceList();
  const updateMutation = useUpdatePriceList(initialData?.id ?? '');
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const defaultTranslation = initialData?.translations[0];

  const defaultValues = useMemo<PriceListFormValues>(
    () => ({
      name: defaultTranslation?.name ?? '',
      description: defaultTranslation?.description ?? '',
      status: initialData?.status ?? 'draft',
      type: initialData?.type ?? 'sale',
      startsAt: toDateTimeLocalValue(initialData?.startsAt),
      endsAt: toDateTimeLocalValue(initialData?.endsAt),
    }),
    [defaultTranslation, initialData]
  );

  const form = useForm<PriceListFormValues, unknown, PriceListFormValues>({
    resolver: zodResolver(priceListFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, initialData, isEditMode]);

  const onSubmit = form.handleSubmit((values) => {
    const languageCode = defaultTranslation?.languageCode ?? 'en';
    const body = {
      status: values.status,
      type: values.type,
      startsAt: toApiDate(values.startsAt),
      endsAt: toApiDate(values.endsAt),
      translations: [
        {
          languageCode,
          name: values.name,
          description: values.description || undefined,
        },
      ],
    };

    if (isCreateMode) {
      createMutation.mutate({ ...body, prices: [] });
    } else {
      updateMutation.mutate(body);
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const title = isCreateMode ? 'New price list' : form.watch('name') || 'Untitled price list';
  const navigateToPriceLists = () => navigate('/price-lists');

  return {
    form,
    isCreateMode,
    isEditMode,
    isPending,
    navigateToPriceLists,
    onSubmit,
    title,
  };
}
