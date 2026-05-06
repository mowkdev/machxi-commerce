import { useEffect, useRef } from 'react';
import { useFormContext, useController } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import type { ProductFormValues } from '../schema';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface GeneralInfoCardProps {
  selectedLocale: string;
}

export function GeneralInfoCard({ selectedLocale }: GeneralInfoCardProps) {
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors, dirtyFields },
  } = useFormContext<ProductFormValues>();

  const namePath = `translations.${selectedLocale}.name` as const;
  const handlePath = `translations.${selectedLocale}.handle` as const;
  const descriptionPath = `translations.${selectedLocale}.description` as const;

  const { field: descriptionField } = useController({
    name: descriptionPath,
    control,
  });

  const name = watch(namePath);
  const localeHandleEdited = useRef<Record<string, boolean>>({});

  const handleDirty = Boolean(
    dirtyFields.translations?.[selectedLocale]?.handle
  );

  useEffect(() => {
    if (
      !localeHandleEdited.current[selectedLocale] &&
      !handleDirty &&
      typeof name === 'string'
    ) {
      setValue(handlePath, slugify(name), { shouldValidate: false });
    }
  }, [name, setValue, handlePath, handleDirty, selectedLocale]);

  const localeLabel = selectedLocale.toUpperCase();
  const nameError = errors.translations?.[selectedLocale]?.name;
  const handleError = errors.translations?.[selectedLocale]?.handle;
  const descriptionError = errors.translations?.[selectedLocale]?.description;

  return (
    <Card>
      <CardHeader>
        <CardTitle>General information</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Name ({localeLabel})</FieldLabel>
            <Input
              key={`name-${selectedLocale}`}
              id="name"
              placeholder="Product name"
              {...register(namePath)}
            />
            <FieldError errors={[nameError]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="handle">Handle ({localeLabel})</FieldLabel>
            <Input
              key={`handle-${selectedLocale}`}
              id="handle"
              placeholder="product-handle"
              {...register(handlePath, {
                onChange: () => {
                  localeHandleEdited.current[selectedLocale] = true;
                },
              })}
            />
            <FieldError errors={[handleError]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="description">
              Description ({localeLabel})
            </FieldLabel>
            <RichTextEditor
              key={`description-${selectedLocale}`}
              value={descriptionField.value ?? ''}
              onChange={descriptionField.onChange}
              placeholder="Product description..."
            />
            <FieldError errors={[descriptionError]} />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
