import { useFormContext, Controller } from 'react-hook-form';
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
import { CategoryMultiSelect } from '@/features/categories/components/CategoryMultiSelect';
import { TaxClassCombobox } from '@/features/tax-classes/components/TaxClassCombobox';
import type { ProductFormValues } from '../schema';

export function OrganizationCard() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProductFormValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>Tax class</FieldLabel>
            <Controller
              control={control}
              name="taxClassId"
              render={({ field }) => (
                <TaxClassCombobox
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <FieldError errors={[errors.taxClassId]} />
          </Field>
          <Field>
            <FieldLabel>Categories</FieldLabel>
            <Controller
              control={control}
              name="categoryIds"
              render={({ field }) => (
                <CategoryMultiSelect
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <FieldError errors={[errors.categoryIds]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="baseSku">Base SKU</FieldLabel>
            <Input
              id="baseSku"
              placeholder="e.g. TSHIRT-001"
              {...register('baseSku')}
            />
            <FieldError errors={[errors.baseSku]} />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
