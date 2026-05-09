import type { PageDetailResponse } from '@repo/types/admin';
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

import { useCmsPageForm } from '../hooks/useCmsPageForm';

import { BlocksEditorCard } from './BlocksEditorCard';
import { PageGeneralInfoCard } from './PageGeneralInfoCard';
import { PageHierarchyCard } from './PageHierarchyCard';
import { PageStatusCard } from './PageStatusCard';


interface PageFormProps {
  mode: 'create' | 'edit';
  initialData?: PageDetailResponse;
}

export function PageForm({ mode, initialData }: PageFormProps) {
  const {
    form,
    title,
    canSave,
    isPending,
    isCreateMode,
    isEditMode,
    languages,
    selectedLocale,
    setSelectedLocale,
    onSubmit,
    navigateToList,
  } = useCmsPageForm({ mode, initialData });

  const localeOptions =
    languages.length > 0
      ? languages
      : [
          {
            code: selectedLocale,
            name: selectedLocale,
            isDefault: true,
            createdAt: '',
            updatedAt: '',
          },
        ];

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
        onBack={navigateToList}
        onSubmit={onSubmit}
        submitLabel={isPending ? 'Saving...' : isCreateMode ? 'Create page' : 'Save'}
        isSubmitting={isPending}
        canSubmit={canSave}
        headerActions={headerActions}
      >
        <FormContentLayout
          maxWidth="5xl"
          sidebar={
            <>
              <PageStatusCard />
              <PageHierarchyCard excludePageId={initialData?.id} />
              {isEditMode && initialData && (
                <RecordTimestampsCard record={initialData} />
              )}
            </>
          }
        >
          <PageGeneralInfoCard selectedLocale={selectedLocale} />
          {isEditMode && initialData && (
            <BlocksEditorCard
              page={initialData}
              selectedLocale={selectedLocale}
            />
          )}
        </FormContentLayout>
      </FormPageShell>
    </FormProvider>
  );
}
