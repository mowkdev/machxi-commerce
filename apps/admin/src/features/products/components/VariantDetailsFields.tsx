import type {
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormReturn,
} from 'react-hook-form';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import type { VariantFormValues } from '../schema';

interface VariantDetailsFieldsProps {
  form: UseFormReturn<VariantFormValues>;
  priceFields: { id: string }[];
  appendPrice: UseFieldArrayAppend<VariantFormValues, 'prices'>;
  removePrice: UseFieldArrayRemove;
}

export function VariantDetailsFields({
  form,
  priceFields,
  appendPrice,
  removePrice,
}: VariantDetailsFieldsProps) {
  return (
    <>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="v-sku">SKU</FieldLabel>
          <Input id="v-sku" {...form.register('sku')} />
          <FieldError errors={[form.formState.errors.sku]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="v-barcode">Barcode</FieldLabel>
          <Input id="v-barcode" {...form.register('barcode')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="v-weight">Weight (g)</FieldLabel>
          <Input
            id="v-weight"
            type="number"
            {...form.register('weight', {
              setValueAs: (value: string) =>
                value === '' ? undefined : Number(value),
            })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="v-status">Status</FieldLabel>
          <Select
            value={form.watch('status')}
            onValueChange={(value) =>
              form.setValue('status', value as VariantFormValues['status'])
            }
          >
            <SelectTrigger id="v-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label className="font-medium">Pricing</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              appendPrice({
                currencyCode: 'USD',
                amount: 0,
                compareAtAmount: undefined,
                minQuantity: 1,
                taxInclusive: false,
              })
            }
          >
            <IconPlus className="size-3.5" />
            Add currency
          </Button>
        </div>

        {priceFields.map((field, index) => (
          <div key={field.id} className="rounded-lg border p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Currency</Label>
                <Input
                  className="mt-1"
                  {...form.register(`prices.${index}.currencyCode`)}
                  maxLength={3}
                  placeholder="EUR"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Amount (cents)
                </Label>
                <Input
                  className="mt-1"
                  type="number"
                  {...form.register(`prices.${index}.amount`, {
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Compare at</Label>
                <Input
                  className="mt-1"
                  type="number"
                  {...form.register(`prices.${index}.compareAtAmount`, {
                    setValueAs: (value: string) =>
                      value === '' ? undefined : Number(value),
                  })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Min qty</Label>
                <Input
                  className="mt-1"
                  type="number"
                  {...form.register(`prices.${index}.minQuantity`, {
                    valueAsNumber: true,
                  })}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.watch(`prices.${index}.taxInclusive`)}
                  onCheckedChange={(value) =>
                    form.setValue(`prices.${index}.taxInclusive`, value)
                  }
                />
                <Label className="text-xs">Tax inclusive</Label>
              </div>
              {priceFields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removePrice(index)}
                >
                  <IconTrash className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
        <FieldError errors={[form.formState.errors.prices]} />
      </div>
    </>
  );
}
