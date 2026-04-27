import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
    formState: { errors, dirtyFields },
  } = useFormContext<ProductFormValues>();

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
            <Textarea
              id="description"
              placeholder="Product description..."
              rows={4}
              {...register('description')}
            />
            <FieldError errors={[errors.description]} />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
