import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import type { CategoryDetail } from '@repo/types/admin';
import { useCategoryOptions, useCreateCategory, useUpdateCategory } from '../hooks';
import { categoryFormSchema, type CategoryFormValues } from '../schema';
import { getNextCategoryRank } from '../utils/category-options';

interface UseCategoryFormParams {
  mode: 'create' | 'edit';
  initialData?: CategoryDetail;
}

export function useCategoryForm({ mode, initialData }: UseCategoryFormParams) {
  const navigate = useNavigate();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory(initialData?.id ?? '');
  const { data: categoryOptions, isPending: isCategoryOptionsPending } = useCategoryOptions();
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const defaultTranslation = initialData?.translations[0];

  const defaultValues = useMemo<CategoryFormValues>(
    () => ({
      name: defaultTranslation?.name ?? '',
      handle: defaultTranslation?.handle ?? '',
      description: defaultTranslation?.description ?? '',
      parentId: initialData?.parentId ?? null,
      isActive: initialData?.isActive ?? true,
      rank: initialData?.rank ?? 0,
    }),
    [defaultTranslation, initialData]
  );

  const form = useForm<CategoryFormValues, unknown, CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset(defaultValues);
    }
  }, [initialData, isEditMode, form, defaultValues]);

  const selectedParentId = form.watch('parentId');
  const computedRank = useMemo(() => {
    if (isEditMode && initialData && selectedParentId === initialData.parentId) {
      return initialData.rank;
    }

    return getNextCategoryRank(categoryOptions ?? [], selectedParentId, initialData?.id);
  }, [categoryOptions, initialData, isEditMode, selectedParentId]);

  useEffect(() => {
    form.setValue('rank', computedRank);
  }, [computedRank, form]);

  const onSubmit = form.handleSubmit((values) => {
    const languageCode = defaultTranslation?.languageCode ?? 'en';
    const body = {
      parentId: values.parentId,
      isActive: values.isActive,
      rank: values.rank,
      translations: [
        {
          languageCode,
          name: values.name,
          description: values.description || undefined,
          handle: values.handle,
        },
      ],
    };

    if (isCreateMode) {
      createMutation.mutate(body);
    } else {
      updateMutation.mutate(body);
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const title = isCreateMode ? 'New category' : form.watch('name') || 'Untitled category';
  const navigateToCategories = () => navigate('/categories');

  return {
    categoryOptions: categoryOptions ?? [],
    form,
    isCategoryOptionsPending,
    isCreateMode,
    isPending,
    navigateToCategories,
    onSubmit,
    title,
  };
}
