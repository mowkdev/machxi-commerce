import { FormProvider } from 'react-hook-form';
import { FormPageShell } from '@/components/form-page-shell';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import type { TaxClassDetail } from '@repo/types/admin';
import { useTaxClassForm } from '../hooks/useTaxClassForm';

interface TaxClassFormProps {
  mode: 'create' | 'edit';
  initialData?: TaxClassDetail;
}

export function TaxClassForm({ mode, initialData }: TaxClassFormProps) {
  const {
    form,
    isCreateMode,
    isPending,
    navigateToTaxClasses,
    onSubmit,
    title,
  } = useTaxClassForm({ mode, initialData });

  return (
    <FormProvider {...form}>
      <FormPageShell
        title={title}
        onBack={navigateToTaxClasses}
        onSubmit={onSubmit}
        submitLabel={isPending ? 'Saving...' : isCreateMode ? 'Create' : 'Save'}
        isSubmitting={isPending}
        contentClassName="mx-auto w-full max-w-xl p-4 lg:p-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  placeholder="e.g. Standard, Reduced, Zero-rated"
                  {...form.register('name')}
                />
                <FieldError errors={[form.formState.errors.name]} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </FormPageShell>
    </FormProvider>
  );
}
