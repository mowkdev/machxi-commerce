import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import type { OptionValueDetail } from '@repo/types/admin';
import { optionValueFormSchema, type OptionValueFormValues } from '../schema';
import {
  buildOptionValueTranslationsMap,
  emptyOptionValueTranslation,
} from '../utils/translation-form';

type FormInput = z.input<typeof optionValueFormSchema>;

export function useOptionValueForm(
  value: OptionValueDetail | null | undefined,
  defaultLocale: string,
  selectedLocale: string
) {
  const defaultValues = useMemo<FormInput>(
    () => ({
      code: value?.code ?? '',
      translations: buildOptionValueTranslationsMap(value ?? undefined, defaultLocale),
    }),
    [value, defaultLocale]
  );

  const form = useForm<FormInput, unknown, OptionValueFormValues>({
    resolver: zodResolver(optionValueFormSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  useEffect(() => {
    const current = form.getValues('translations');
    if (!current || !current[selectedLocale]) {
      form.setValue(
        `translations.${selectedLocale}`,
        emptyOptionValueTranslation(),
        { shouldDirty: false }
      );
    }
  }, [selectedLocale, form]);

  return { form };
}
