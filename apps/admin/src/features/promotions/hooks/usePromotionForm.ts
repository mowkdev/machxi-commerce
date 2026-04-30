import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import type { PromotionDetail } from '@repo/types/admin';
import { useCreatePromotion, useUpdatePromotion } from '../hooks';
import {
  normalizePromotionCreateValues,
  normalizePromotionUpdateValues,
  promotionFormSchema,
  type PromotionFormValues,
} from '../schema';

interface UsePromotionFormParams {
  mode: 'create' | 'edit';
  initialData?: PromotionDetail;
}

function toDateTimeLocalValue(value: string | null | undefined) {
  return value ? value.slice(0, 16) : '';
}

export function usePromotionForm({ mode, initialData }: UsePromotionFormParams) {
  const navigate = useNavigate();
  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion(initialData?.id ?? '');
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const defaultTranslation = initialData?.translations[0];
  const defaultAmount = initialData?.amounts[0];

  const defaultValues = useMemo<PromotionFormValues>(
    () => ({
      code: initialData?.code ?? '',
      displayName: defaultTranslation?.displayName ?? '',
      terms: defaultTranslation?.terms ?? '',
      type: initialData?.type ?? 'percentage',
      percentageValue: initialData?.percentageValue ?? '10',
      fixedCurrencyCode: defaultAmount?.currencyCode ?? 'USD',
      fixedAmount: defaultAmount ? String(defaultAmount.amount) : '',
      startsAt: toDateTimeLocalValue(initialData?.startsAt),
      expiresAt: toDateTimeLocalValue(initialData?.expiresAt),
      usageLimit: initialData?.usageLimit ? String(initialData.usageLimit) : '',
      usageLimitPerCustomer: initialData?.usageLimitPerCustomer
        ? String(initialData.usageLimitPerCustomer)
        : '',
      minCartAmount: String(initialData?.minCartAmount ?? 0),
      minCartQuantity: String(initialData?.minCartQuantity ?? 0),
    }),
    [defaultAmount, defaultTranslation, initialData]
  );

  const form = useForm<PromotionFormValues, unknown, PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, initialData, isEditMode]);

  const onSubmit = form.handleSubmit((values) => {
    if (isCreateMode) {
      createMutation.mutate(normalizePromotionCreateValues(values));
    } else {
      updateMutation.mutate(
        normalizePromotionUpdateValues(values, defaultTranslation?.languageCode ?? 'en')
      );
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const title = isCreateMode ? 'New promotion' : form.watch('displayName') || 'Untitled promotion';
  const navigateToPromotions = () => navigate('/promotions');

  return {
    form,
    isCreateMode,
    isEditMode,
    isPending,
    navigateToPromotions,
    onSubmit,
    title,
  };
}
