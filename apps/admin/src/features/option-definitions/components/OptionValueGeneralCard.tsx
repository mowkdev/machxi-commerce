import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import type { OptionValueFormValues } from '../schema';

interface OptionValueGeneralCardProps {
  selectedLocale: string;
}

export function OptionValueGeneralCard({ selectedLocale }: OptionValueGeneralCardProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<OptionValueFormValues>();

  const labelPath = `translations.${selectedLocale}.label` as const;
  const localeLabel = selectedLocale.toUpperCase();
  const labelError = errors.translations?.[selectedLocale]?.label;
  const codeError = errors.code;

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="value-label">Label ({localeLabel})</FieldLabel>
        <Input
          key={`label-${selectedLocale}`}
          id="value-label"
          placeholder="Value label"
          {...register(labelPath)}
        />
        <FieldError errors={[labelError]} />
      </Field>
      <Field>
        <FieldLabel htmlFor="value-code">Code</FieldLabel>
        <Input
          id="value-code"
          placeholder="value-code"
          {...register('code')}
        />
        <FieldError errors={[codeError]} />
      </Field>
    </FieldGroup>
  );
}
