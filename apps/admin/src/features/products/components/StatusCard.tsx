import { useFormContext, Controller } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { ProductFormValues } from '../schema';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', description: 'Not visible to customers' },
  { value: 'published', label: 'Published', description: 'Visible and purchasable' },
  { value: 'archived', label: 'Archived', description: 'Hidden from storefront' },
] as const;

export function StatusCard() {
  const { control } = useFormContext<ProductFormValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <CardContent>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="flex flex-col gap-3"
            >
              {STATUS_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-start gap-3">
                  <RadioGroupItem value={opt.value} id={`status-${opt.value}`} />
                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor={`status-${opt.value}`} className="font-medium">
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
