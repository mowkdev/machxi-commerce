import { zodResolver } from '@hookform/resolvers/zod';
import type {
  PageDetailResponse,
  PageTranslationBody,
} from '@repo/types/admin';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import type { z } from 'zod';

import {
  emptyPageTranslation,
  pageFormSchema,
  type PageFormValues,
  type PageTranslationFields,
} from '../schema';

import { useCmsPageLocales } from './useCmsPageLocales';

import { useCreatePage, useUpdatePage } from './index';

interface UseCmsPageFormParams {
  mode: 'create' | 'edit';
  initialData?: PageDetailResponse;
}

type PageFormInput = z.input<typeof pageFormSchema>;

function buildTranslationsMap(
  initialData: PageDetailResponse | undefined,
  defaultLocale: string
): Record<string, PageTranslationFields> {
  const map: Record<string, PageTranslationFields> = {};
  if (initialData) {
    for (const t of initialData.translations) {
      map[t.languageCode] = {
        title: t.title,
        handle: t.handle,
        metaTitle: t.metaTitle ?? '',
        metaDescription: t.metaDescription ?? '',
      };
    }
  }
  if (!map[defaultLocale]) map[defaultLocale] = emptyPageTranslation();
  return map;
}

function collectTranslations(values: PageFormValues): PageTranslationBody[] {
  return Object.entries(values.translations)
    .filter(([, fields]) => fields.title.trim() && fields.handle.trim())
    .map(([languageCode, fields]) => ({
      languageCode,
      title: fields.title.trim(),
      handle: fields.handle.trim(),
      metaTitle: fields.metaTitle?.trim() || undefined,
      metaDescription: fields.metaDescription?.trim() || undefined,
    }));
}

export function useCmsPageForm({ mode, initialData }: UseCmsPageFormParams) {
  const navigate = useNavigate();
  const createMutation = useCreatePage();
  const updateMutation = useUpdatePage(initialData?.id ?? '');

  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const { defaultLocale, languages, selectedLocale, setSelectedLocale } =
    useCmsPageLocales(initialData);

  const defaultValues = useMemo<PageFormInput>(
    () => ({
      parentId: initialData?.parentId ?? null,
      status: (initialData?.status as PageFormValues['status']) ?? 'draft',
      templateKey: initialData?.templateKey ?? null,
      translations: buildTranslationsMap(initialData, defaultLocale),
    }),
    [initialData, defaultLocale]
  );

  const form = useForm<PageFormInput, unknown, PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset(defaultValues);
    }
  }, [initialData, isEditMode, form, defaultValues]);

  // Lazy-create a translation entry when the user switches locale.
  useEffect(() => {
    const current = form.getValues('translations');
    if (!current || !current[selectedLocale]) {
      form.setValue(`translations.${selectedLocale}`, emptyPageTranslation(), {
        shouldDirty: false,
      });
    }
  }, [selectedLocale, form]);

  const isDirty = form.formState.isDirty;
  const canSave = isDirty;

  function ensureActiveLocaleFilled(values: PageFormValues): boolean {
    const fields = values.translations[selectedLocale];
    let ok = true;
    if (!fields?.title.trim()) {
      form.setError(`translations.${selectedLocale}.title`, {
        type: 'required',
        message: 'Title is required',
      });
      ok = false;
    }
    if (!fields?.handle.trim()) {
      form.setError(`translations.${selectedLocale}.handle`, {
        type: 'required',
        message: 'Handle is required',
      });
      ok = false;
    }
    return ok;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!canSave) return;
    if (!ensureActiveLocaleFilled(values)) return;

    const translations = collectTranslations(values);
    if (translations.length === 0) {
      form.setError(`translations.${selectedLocale}.title`, {
        type: 'required',
        message: 'Title is required',
      });
      return;
    }

    if (isCreateMode) {
      createMutation.mutate({
        parentId: values.parentId,
        status: values.status,
        templateKey: values.templateKey ?? null,
        translations,
      });
      return;
    }

    updateMutation.mutate(
      {
        parentId: values.parentId,
        status: values.status,
        templateKey: values.templateKey ?? null,
        translations,
      },
      {
        onSuccess: () => {
          form.reset(values);
        },
      }
    );
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const defaultTitle = form.watch(
    `translations.${defaultLocale}.title` as const
  );
  const title = isCreateMode ? 'New page' : defaultTitle || 'Untitled page';
  const navigateToList = () => navigate('/cms/pages');

  return {
    form,
    title,
    canSave,
    isPending,
    isCreateMode,
    isEditMode,
    languages,
    selectedLocale,
    setSelectedLocale,
    defaultLocale,
    onSubmit,
    navigateToList,
  };
}
