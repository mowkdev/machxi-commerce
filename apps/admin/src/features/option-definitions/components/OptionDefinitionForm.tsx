import { FormProvider } from 'react-hook-form';
import { FormContentLayout } from '@/components/form-content-layout';
import { FormPageShell } from '@/components/form-page-shell';
import { RecordTimestampsCard } from '@/components/record-timestamps-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OptionDefinitionDetail } from '@repo/types/admin';
import { OptionDefinitionGeneralCard } from './OptionDefinitionGeneralCard';
import { OptionValuesTable } from './OptionValuesTable';
import { useOptionDefinitionForm } from '../hooks/useOptionDefinitionForm';

interface OptionDefinitionFormProps {
  mode: 'create' | 'edit';
  initialData?: OptionDefinitionDetail;
}

export function OptionDefinitionForm({ mode, initialData }: OptionDefinitionFormProps) {
  const {
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
    title,
  } = useOptionDefinitionForm({ mode, initialData });

  const localeOptions =
    languages.length > 0
      ? languages
      : [{ code: selectedLocale, name: selectedLocale, isDefault: true, createdAt: '', updatedAt: '' }];

  const headerActions = isEditMode ? (
    <Select value={selectedLocale} onValueChange={setSelectedLocale}>
      <SelectTrigger size="sm" aria-label="Locale" className="w-20 uppercase">
        <SelectValue placeholder="Locale" />
      </SelectTrigger>
      <SelectContent>
        {localeOptions.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="uppercase">
            {lang.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : undefined;

  return (
    <FormProvider {...form}>
      <FormPageShell
        title={title}
        onBack={navigateBack}
        onSubmit={onSubmit}
        submitLabel={isPending ? 'Saving...' : isCreateMode ? 'Create option' : 'Save'}
        isSubmitting={isPending}
        canSubmit={canSave}
        headerActions={headerActions}
      >
        <FormContentLayout
          sidebar={
            isEditMode && initialData ? (
              <RecordTimestampsCard record={initialData} />
            ) : undefined
          }
        >
          <OptionDefinitionGeneralCard
            selectedLocale={selectedLocale}
            isCreateMode={isCreateMode}
          />
          {isEditMode && initialData && (
            <OptionValuesTable
              definition={initialData}
              selectedLocale={selectedLocale}
              defaultLocale={defaultLocale}
            />
          )}
        </FormContentLayout>
      </FormPageShell>
    </FormProvider>
  );
}
