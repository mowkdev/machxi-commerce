import { useFormContext, Controller } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { ProductFormValues } from '../schema';

const TYPE_OPTIONS = [
  {
    value: 'simple',
    label: 'Simple product',
    description:
      'A single SKU with one set of prices. Best for most physical and digital goods.',
  },
  {
    value: 'variable',
    label: 'Variable product',
    description:
      'Multiple variants based on options like size or color, each with its own SKU and price.',
  },
] as const;

interface ProductTypeCardProps {
  /**
   * Once the product is created, the type is immutable — switching simple↔variable
   * would orphan variants/options. The card stays visible but locked on edit.
   */
  locked?: boolean;
}

export function ProductTypeCard({ locked = false }: ProductTypeCardProps) {
  const { control } = useFormContext<ProductFormValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product type</CardTitle>
        <CardDescription>
          {locked
            ? 'Product type is fixed after creation.'
            : 'Choose the type of product you are creating.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              disabled={locked}
              className="flex flex-col gap-3"
            >
              {TYPE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-start gap-3">
                  <RadioGroupItem
                    value={opt.value}
                    id={`type-${opt.value}`}
                    disabled={locked}
                  />
                  <div className="flex flex-col gap-0.5">
                    <Label
                      htmlFor={`type-${opt.value}`}
                      className="font-medium"
                    >
                      {opt.label}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {opt.description}
                    </span>
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}
        />
      </CardContent>
    </Card>
  );
}
