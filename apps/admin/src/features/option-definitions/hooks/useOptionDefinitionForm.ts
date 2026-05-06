import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import type { z } from 'zod';
import type { OptionDefinitionDetail } from '@repo/types/admin';
import { useCreateOptionDefinition, useUpdateOptionDefinition } from '../hooks';
import {
  optionDefinitionFormSchema,
  type OptionDefinitionFormValues,
} from '../schema';
import {
  buildOptionDefinitionTranslationsMap,
  collectOptionDefinitionTranslations,
  emptyOptionDefinitionTranslation,
} from '../utils/translation-form';
import { useOptionDefinitionLocales } from './useOptionDefinitionLocales';

interface UseOptionDefinitionFormParams {
  mode: 'create' | 'edit';
  initialData?: OptionDefinitionDetail;
}

type FormInput = z.input<typeof optionDefinitionFormSchema>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function useOptionDefinitionForm({ mode, initialData }: UseOptionDefinitionFormParams) {
  const navigate = useNavigate();
  const createMutation = useCreateOptionDefinition();
  const updateMutation = useUpdateOptionDefinition(initialData?.id ?? '');

  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const { defaultLocale, languages, selectedLocale, setSelectedLocale } =
    useOptionDefinitionLocales(initialData);

  const defaultValues = useMemo<FormInput>(
    () => ({
      code: initialData?.code ?? '',
      translations: buildOptionDefinitionTranslationsMap(initialData, defaultLocale),
    }),
    [initialData, defaultLocale]
  );

  const form = useForm<FormInput, unknown, OptionDefinitionFormValues>({
    resolver: zodResolver(optionDefinitionFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset(defaultValues);
    }
  }, [initialData, isEditMode, form, defaultValues]);

  useEffect(() => {
    const current = form.getValues('translations');
    if (!current || !current[selectedLocale]) {
      form.setValue(
        `translations.${selectedLocale}`,
        emptyOptionDefinitionTranslation(),
        { shouldDirty: false }
      );
    }
  }, [selectedLocale, form]);

  const canSave = form.formState.isDirty;

  function ensureActiveLocaleFilled(
    values: OptionDefinitionFormValues,
    translations: ReturnType<typeof collectOptionDefinitionTranslations>
  ): boolean {
    const activeFields = values.translations[selectedLocale];
    if (!activeFields?.name.trim()) {
      form.setError(`translations.${selectedLocale}.name`, {
        type: 'required',
        message: 'Name is required',
      });
      return false;
    }

    if (translations.length === 0) {
      form.setError(`translations.${selectedLocale}.name`, {
        type: 'required',
        message: 'Name is required',
      });
      return false;
    }

    return true;
  }

  function submitCreate(values: OptionDefinitionFormValues, translations: ReturnType<typeof collectOptionDefinitionTranslations>) {
    createMutation.mutate({
      code: values.code,
      translations,
    });
  }

  function submitEdit(values: OptionDefinitionFormValues, translations: ReturnType<typeof collectOptionDefinitionTranslations>) {
    updateMutation.mutate(
      {
        code: values.code,
        translations,
      },
      {
        onSuccess: () => {
          form.reset(values);
        },
      }
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!canSave) return;

    const translations = collectOptionDefinitionTranslations(values);
    if (!ensureActiveLocaleFilled(values, translations)) return;

    if (isCreateMode) return submitCreate(values, translations);
    submitEdit(values, translations);
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const defaultName = form.watch(`translations.${defaultLocale}.name` as const);
  const code = form.watch('code');
  const title = isCreateMode
    ? 'New option'
    : defaultName || code || 'Untitled option';
  const navigateBack = () => navigate('/options');

  return {
    canSave,
    defaultLocale,
    form,
    isCreateMode,
    isEditMode,
    isPending,
    languages,
    navigateBack,
    onSubmit,
    selectedLocale,
    setSelectedLocale,
    slugify,
    title,
  };
}
