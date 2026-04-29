import { FormProvider } from 'react-hook-form';
import { FormPageShell } from '@/components/form-page-shell';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { StockLocationDetail } from '@repo/types/admin';
import { useStockLocationForm } from '../hooks/useStockLocationForm';

interface StockLocationFormProps {
  mode: 'create' | 'edit';
  initialData?: StockLocationDetail;
}

export function StockLocationForm({ mode, initialData }: StockLocationFormProps) {
  const {
    form,
    isCreateMode,
    isPending,
    navigateToStockLocations,
    onSubmit,
    title,
  } = useStockLocationForm({ mode, initialData });

  return (
    <FormProvider {...form}>
      <FormPageShell
        title={title}
        onBack={navigateToStockLocations}
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
                  placeholder="e.g. Main warehouse"
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
