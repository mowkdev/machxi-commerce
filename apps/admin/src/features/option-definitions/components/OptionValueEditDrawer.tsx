import { FormProvider } from 'react-hook-form';
import { SidePanelForm } from '@/components/side-panel-form';
import type { OptionValueDetail } from '@repo/types/admin';
import { useCreateOptionValue, useUpdateOptionValue } from '../hooks';
import { useOptionValueForm } from '../hooks/useOptionValueForm';
import { collectOptionValueTranslations } from '../utils/translation-form';
import { OptionValueGeneralCard } from './OptionValueGeneralCard';

interface OptionValueEditDrawerProps {
  optionId: string;
  value: OptionValueDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLocale: string;
  defaultLocale: string;
}

export function OptionValueEditDrawer({
  optionId,
  value,
  open,
  onOpenChange,
  selectedLocale,
  defaultLocale,
}: OptionValueEditDrawerProps) {
  const isNewValue = !value;
  const createMutation = useCreateOptionValue(optionId);
  const updateMutation = useUpdateOptionValue(optionId);
  const { form } = useOptionValueForm(value, defaultLocale, selectedLocale);

  const onSubmit = form.handleSubmit((values) => {
    const translations = collectOptionValueTranslations(values);
    const activeLabel = values.translations[selectedLocale]?.label?.trim();
    if (!activeLabel) {
      form.setError(`translations.${selectedLocale}.label`, {
        type: 'required',
        message: 'Label is required',
      });
      return;
    }
    if (translations.length === 0) return;

    if (isNewValue) {
      createMutation.mutate(
        { code: values.code, translations },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      updateMutation.mutate(
        { valueId: value.id, body: { code: values.code, translations } },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <SidePanelForm
      open={open}
      onOpenChange={onOpenChange}
      title={isNewValue ? 'New value' : 'Edit value'}
      description={value ? value.code : undefined}
      formId="option-value-form"
      onSubmit={onSubmit}
      submitLabel={isPending ? 'Saving...' : isNewValue ? 'Create value' : 'Save value'}
      isSubmitting={isPending}
    >
      <FormProvider {...form}>
        <OptionValueGeneralCard selectedLocale={selectedLocale} />
      </FormProvider>
    </SidePanelForm>
  );
}
