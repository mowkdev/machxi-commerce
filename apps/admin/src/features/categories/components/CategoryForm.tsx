import { Controller, FormProvider } from 'react-hook-form';
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
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Switch } from '@/components/ui/switch';
import type { CategoryDetail } from '@repo/types/admin';
import { useCategoryForm } from '../hooks/useCategoryForm';
import { ParentCategoryCombobox } from './ParentCategoryCombobox';

interface CategoryFormProps {
  mode: 'create' | 'edit';
  initialData?: CategoryDetail;
}

export function CategoryForm({ mode, initialData }: CategoryFormProps) {
  const {
    categoryOptions,
    form,
    isCategoryOptionsPending,
    isCreateMode,
    isPending,
    navigateToCategories,
    onSubmit,
    title,
  } = useCategoryForm({ mode, initialData });

  return (
    <FormProvider {...form}>
      <FormPageShell
        title={title}
        onBack={navigateToCategories}
        onSubmit={onSubmit}
        submitLabel={isPending ? 'Saving...' : isCreateMode ? 'Create' : 'Save'}
        isSubmitting={isPending}
        contentClassName="grid gap-6 p-4 lg:grid-cols-3 lg:p-6"
      >
        <div className="flex flex-col gap-6 lg:col-span-2">
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
                    placeholder="e.g. T-shirts"
                    {...form.register('name')}
                  />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="handle">Handle</FieldLabel>
                  <Input
                    id="handle"
                    placeholder="e.g. t-shirts"
                    {...form.register('handle')}
                  />
                  <FieldError errors={[form.formState.errors.handle]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Controller
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Category description..."
                      />
                    )}
                  />
                  <FieldError errors={[form.formState.errors.description]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel>Parent category</FieldLabel>
                  <Controller
                    control={form.control}
                    name="parentId"
                    render={({ field }) => (
                      <ParentCategoryCombobox
                        value={field.value}
                        onChange={field.onChange}
                        excludeId={initialData?.id}
                        categories={categoryOptions ?? []}
                        isPending={isCategoryOptionsPending}
                      />
                    )}
                  />
                  <FieldError errors={[form.formState.errors.parentId]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="rank">Rank</FieldLabel>
                  <Input
                    id="rank"
                    type="number"
                    min={0}
                    readOnly
                    className="bg-muted"
                    {...form.register('rank', { valueAsNumber: true })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Rank is assigned automatically for the selected level.
                  </p>
                  <FieldError errors={[form.formState.errors.rank]} />
                </Field>
                <Field className="flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FieldLabel>Active</FieldLabel>
                    <p className="text-sm text-muted-foreground">
                      Active categories can be assigned to products.
                    </p>
                  </div>
                  <Controller
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Category active status"
                      />
                    )}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>
      </FormPageShell>
    </FormProvider>
  );
}
