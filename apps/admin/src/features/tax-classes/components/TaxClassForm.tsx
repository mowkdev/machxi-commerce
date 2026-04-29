import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
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
import { useCreateTaxClass, useUpdateTaxClass } from '../hooks';
import { taxClassFormSchema, type TaxClassFormValues } from '../schema';

interface TaxClassFormProps {
  mode: 'create' | 'edit';
  initialData?: TaxClassDetail;
}

export function TaxClassForm({ mode, initialData }: TaxClassFormProps) {
  const navigate = useNavigate();
  const createMutation = useCreateTaxClass();
  const updateMutation = useUpdateTaxClass(initialData?.id ?? '');

  const defaultValues = useMemo<TaxClassFormValues>(
    () => ({
      name: initialData?.name ?? '',
    }),
    [initialData]
  );

  const form = useForm<TaxClassFormValues>({
    resolver: zodResolver(taxClassFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      form.reset(defaultValues);
    }
  }, [initialData, mode, form, defaultValues]);

  const onSubmit = form.handleSubmit((values) => {
    if (mode === 'create') {
      createMutation.mutate({ name: values.name });
    } else {
      updateMutation.mutate({ name: values.name });
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const title = mode === 'create' ? 'New tax class' : (form.watch('name') || 'Untitled');

  return (
    <FormPageShell
      title={title}
      onBack={() => navigate('/tax-classes')}
      onSubmit={onSubmit}
      submitLabel={isPending ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
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
  );
}
