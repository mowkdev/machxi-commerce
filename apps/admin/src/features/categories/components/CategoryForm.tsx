import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { FormPageShell } from '@/components/form-page-shell';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { CategoryDetail, CategoryListItem } from '@repo/types/admin';
import { useCategoryOptions, useCreateCategory, useUpdateCategory } from '../hooks';
import { categoryFormSchema, type CategoryFormValues } from '../schema';

interface CategoryFormProps {
  mode: 'create' | 'edit';
  initialData?: CategoryDetail;
}

export function CategoryForm({ mode, initialData }: CategoryFormProps) {
  const navigate = useNavigate();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory(initialData?.id ?? '');
  const { data: categoryOptions, isPending: isCategoryOptionsPending } = useCategoryOptions();
  const defaultTranslation = initialData?.translations[0];

  const defaultValues = useMemo<CategoryFormValues>(
    () => ({
      name: defaultTranslation?.name ?? '',
      handle: defaultTranslation?.handle ?? '',
      description: defaultTranslation?.description ?? '',
      parentId: initialData?.parentId ?? null,
      isActive: initialData?.isActive ?? true,
      rank: initialData?.rank ?? 0,
    }),
    [defaultTranslation, initialData]
  );

  const form = useForm<CategoryFormValues, unknown, CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      form.reset(defaultValues);
    }
  }, [initialData, mode, form, defaultValues]);

  const selectedParentId = form.watch('parentId');
  const computedRank = useMemo(() => {
    if (mode === 'edit' && initialData && selectedParentId === initialData.parentId) {
      return initialData.rank;
    }

    return getNextCategoryRank(categoryOptions ?? [], selectedParentId, initialData?.id);
  }, [categoryOptions, initialData, mode, selectedParentId]);

  useEffect(() => {
    form.setValue('rank', computedRank);
  }, [computedRank, form]);

  const onSubmit = form.handleSubmit((values) => {
    const languageCode = defaultTranslation?.languageCode ?? 'en';
    const body = {
      parentId: values.parentId,
      isActive: values.isActive,
      rank: values.rank,
      translations: [
        {
          languageCode,
          name: values.name,
          description: values.description || undefined,
          handle: values.handle,
        },
      ],
    };

    if (mode === 'create') {
      createMutation.mutate(body);
    } else {
      updateMutation.mutate(body);
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const title = mode === 'create' ? 'New category' : form.watch('name') || 'Untitled category';

  return (
    <FormPageShell
      title={title}
      onBack={() => navigate('/categories')}
      onSubmit={onSubmit}
      submitLabel={isPending ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
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
  );
}

function ParentCategoryCombobox({
  value,
  onChange,
  excludeId,
  categories,
  isPending,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  excludeId?: string;
  categories: CategoryListItem[];
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const options = categories.filter((category) => category.id !== excludeId);
  const selected = options.find((category) => category.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm shadow-xs',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'outline-none',
            !selected && 'text-muted-foreground'
          )}
        >
          {selected ? getCategoryLabel(selected) : 'No parent category'}
          <IconChevronDown className="ml-auto size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start" sideOffset={4}>
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>
              {isPending ? 'Loading...' : 'No categories found.'}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="No parent category"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <IconCheck
                  className={cn('mr-2 size-4', value === null ? 'opacity-100' : 'opacity-0')}
                />
                No parent category
              </CommandItem>
              {options.map((category) => (
                <CommandItem
                  key={category.id}
                  value={getCategoryLabel(category)}
                  onSelect={() => {
                    onChange(category.id);
                    setOpen(false);
                  }}
                >
                  <IconCheck
                    className={cn(
                      'mr-2 size-4',
                      value === category.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {getCategoryLabel(category)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function getCategoryLabel(category: CategoryListItem) {
  return category.parentName ? `${category.parentName} / ${category.name}` : category.name;
}

function getNextCategoryRank(
  categories: CategoryListItem[],
  parentId: string | null,
  excludeId?: string
) {
  const siblingRanks = categories
    .filter((category) => category.id !== excludeId && category.parentId === parentId)
    .map((category) => category.rank);

  return siblingRanks.length === 0 ? 1 : Math.max(...siblingRanks) + 1;
}
