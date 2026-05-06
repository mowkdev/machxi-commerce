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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LanguageListItem } from '@repo/types/admin';
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
  onLocaleChange: (locale: string) => void;
  languages: LanguageListItem[];
}

export function GeneralInfoCard({
  selectedLocale,
  onLocaleChange,
  languages,
}: GeneralInfoCardProps) {
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

  // Build options with default-language tag, ensuring at least the active
  // locale shows up if the languages list hasn't loaded yet.
  const options =
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

  const nameError = errors.translations?.[selectedLocale]?.name;
  const handleError = errors.translations?.[selectedLocale]?.handle;
  const descriptionError = errors.translations?.[selectedLocale]?.description;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>General information</CardTitle>
        <Select value={selectedLocale} onValueChange={onLocaleChange}>
          <SelectTrigger className="w-44" aria-label="Locale">
            <SelectValue placeholder="Locale" />
          </SelectTrigger>
          <SelectContent>
            {options.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name} ({lang.code})
                {lang.isDefault ? ' • default' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Name ({selectedLocale})</FieldLabel>
            <Input
              id="name"
              placeholder="Product name"
              {...register(namePath)}
            />
            <FieldError errors={[nameError]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="handle">Handle ({selectedLocale})</FieldLabel>
            <Input
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
              Description ({selectedLocale})
            </FieldLabel>
            <RichTextEditor
              key={selectedLocale}
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
