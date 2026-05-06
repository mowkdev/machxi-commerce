import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
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
import type { OptionDefinitionFormValues } from '../schema';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface OptionDefinitionGeneralCardProps {
  selectedLocale: string;
  isCreateMode: boolean;
}

export function OptionDefinitionGeneralCard({
  selectedLocale,
  isCreateMode,
}: OptionDefinitionGeneralCardProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useFormContext<OptionDefinitionFormValues>();

  const namePath = `translations.${selectedLocale}.name` as const;

  const name = watch(namePath);
  const codeEdited = useRef(false);

  const codeDirty = Boolean(dirtyFields.code);

  useEffect(() => {
    if (
      isCreateMode &&
      !codeEdited.current &&
      !codeDirty &&
      typeof name === 'string'
    ) {
      setValue('code', slugify(name), { shouldValidate: false });
    }
  }, [name, setValue, codeDirty, isCreateMode]);

  const localeLabel = selectedLocale.toUpperCase();
  const nameError = errors.translations?.[selectedLocale]?.name;
  const codeError = errors.code;

  return (
    <Card>
      <CardHeader>
        <CardTitle>General information</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="option-name">Name ({localeLabel})</FieldLabel>
            <Input
              key={`name-${selectedLocale}`}
              id="option-name"
              placeholder="Option name"
              {...register(namePath)}
            />
            <FieldError errors={[nameError]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="option-code">Code</FieldLabel>
            <Input
              id="option-code"
              placeholder="option-code"
              {...register('code', {
                onChange: () => {
                  codeEdited.current = true;
                },
              })}
            />
            <FieldError errors={[codeError]} />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
