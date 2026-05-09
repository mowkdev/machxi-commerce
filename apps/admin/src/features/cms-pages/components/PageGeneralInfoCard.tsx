import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import type { PageFormValues } from '../schema';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface PageGeneralInfoCardProps {
  selectedLocale: string;
}

export function PageGeneralInfoCard({ selectedLocale }: PageGeneralInfoCardProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useFormContext<PageFormValues>();

  const titlePath = `translations.${selectedLocale}.title` as const;
  const handlePath = `translations.${selectedLocale}.handle` as const;
  const metaTitlePath = `translations.${selectedLocale}.metaTitle` as const;
  const metaDescPath = `translations.${selectedLocale}.metaDescription` as const;

  const title = watch(titlePath);
  const localeHandleEdited = useRef<Record<string, boolean>>({});
  const handleDirty = Boolean(dirtyFields.translations?.[selectedLocale]?.handle);

  useEffect(() => {
    if (
      !localeHandleEdited.current[selectedLocale] &&
      !handleDirty &&
      typeof title === 'string'
    ) {
      setValue(handlePath, slugify(title), { shouldValidate: false });
    }
  }, [title, setValue, handlePath, handleDirty, selectedLocale]);

  const localeLabel = selectedLocale.toUpperCase();
  const titleError = errors.translations?.[selectedLocale]?.title;
  const handleError = errors.translations?.[selectedLocale]?.handle;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page details</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="title">Title ({localeLabel})</FieldLabel>
            <Input
              key={`title-${selectedLocale}`}
              id="title"
              placeholder="About us"
              {...register(titlePath)}
            />
            <FieldError errors={[titleError]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="handle">Handle ({localeLabel})</FieldLabel>
            <Input
              key={`handle-${selectedLocale}`}
              id="handle"
              placeholder="about-us"
              {...register(handlePath, {
                onChange: () => {
                  localeHandleEdited.current[selectedLocale] = true;
                },
              })}
            />
            <FieldError errors={[handleError]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="metaTitle">Meta title ({localeLabel})</FieldLabel>
            <Input
              key={`metaTitle-${selectedLocale}`}
              id="metaTitle"
              placeholder="Optional — defaults to title"
              {...register(metaTitlePath)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="metaDescription">
              Meta description ({localeLabel})
            </FieldLabel>
            <Textarea
              key={`metaDesc-${selectedLocale}`}
              id="metaDescription"
              placeholder="Brief description for search engines"
              rows={3}
              {...register(metaDescPath)}
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
