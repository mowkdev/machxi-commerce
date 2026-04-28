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

export function GeneralInfoCard() {
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors, dirtyFields },
  } = useFormContext<ProductFormValues>();

  const { field: descriptionField } = useController({
    name: 'description',
    control,
  });

  const name = watch('name');
  const handleManuallyEdited = useRef(false);

  useEffect(() => {
    if (!handleManuallyEdited.current && !dirtyFields.handle) {
      setValue('handle', slugify(name), { shouldValidate: false });
    }
  }, [name, setValue, dirtyFields.handle]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>General information</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              placeholder="Product name"
              {...register('name')}
            />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="handle">Handle</FieldLabel>
            <Input
              id="handle"
              placeholder="product-handle"
              {...register('handle', {
                onChange: () => {
                  handleManuallyEdited.current = true;
                },
              })}
            />
            <FieldError errors={[errors.handle]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <RichTextEditor
              value={descriptionField.value}
              onChange={descriptionField.onChange}
              placeholder="Product description..."
            />
            <FieldError errors={[errors.description]} />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
