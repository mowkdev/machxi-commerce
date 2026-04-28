import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { ProductDetailVariant } from '@repo/types/admin';
import { useUpdateVariant } from '../hooks';
import { variantFormSchema, type VariantFormValues } from '../schema';
import {
  DEFAULT_VARIANT_FORM_VALUES,
  getUpdateVariantBody,
  getVariantFormValues,
} from '../utils/variant-form';
import { VariantDetailsFields } from './VariantDetailsFields';

interface VariantEditDrawerProps {
  productId: string;
  variant: ProductDetailVariant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getVariantLabel(variant: ProductDetailVariant): string {
  return variant.optionValues
    .map((ov) => ov.value.translations[0]?.label ?? '?')
    .join(' / ') || variant.sku;
}

export function VariantEditDrawer({
  productId,
  variant,
  open,
  onOpenChange,
}: VariantEditDrawerProps) {
  const updateMutation = useUpdateVariant(productId);

  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: DEFAULT_VARIANT_FORM_VALUES,
  });

  const { fields: priceFields, append: appendPrice, remove: removePrice } =
    useFieldArray({ control: form.control, name: 'prices' });

  useEffect(() => {
    if (variant) {
      form.reset(getVariantFormValues(variant));
    }
  }, [variant, form]);

  const onSubmit = form.handleSubmit((values) => {
    if (!variant) return;
    updateMutation.mutate(
      {
        variantId: variant.id,
        body: getUpdateVariantBody(values),
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  });

  if (!variant) return null;

  const label = getVariantLabel(variant);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit variant</SheetTitle>
          <SheetDescription>
            <div className="flex flex-wrap gap-1.5">
              {variant.optionValues.map((ov) => (
                <Badge key={ov.valueId} variant="secondary">
                  {ov.value.translations[0]?.label ?? '?'}
                </Badge>
              ))}
              {variant.optionValues.length === 0 && (
                <span className="text-muted-foreground">{label}</span>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-1">
          <form id="variant-form" onSubmit={onSubmit} className="flex flex-col gap-6 p-1">
            <VariantDetailsFields
              form={form}
              priceFields={priceFields}
              appendPrice={appendPrice}
              removePrice={removePrice}
            />
          </form>
        </ScrollArea>

        <SheetFooter>
          <Button
            type="submit"
            form="variant-form"
            disabled={updateMutation.isPending}
            className="w-full"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save variant'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
