import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import type { ProductDetailVariant } from '@repo/types/admin';
import { useUpdateVariant } from '../hooks';
import { variantFormSchema, type VariantFormValues } from '../schema';

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
    defaultValues: {
      sku: '',
      barcode: '',
      weight: undefined,
      status: 'draft',
      prices: [
        {
          currencyCode: 'EUR',
          amount: 0,
          compareAtAmount: undefined,
          minQuantity: 1,
          taxInclusive: true,
        },
      ],
    },
  });

  const { fields: priceFields, append: appendPrice, remove: removePrice } =
    useFieldArray({ control: form.control, name: 'prices' });

  useEffect(() => {
    if (variant) {
      form.reset({
        sku: variant.sku,
        barcode: variant.barcode ?? '',
        weight: variant.weight ?? undefined,
        status: variant.status as VariantFormValues['status'],
        prices: variant.prices.length > 0
          ? variant.prices.map((p) => ({
              currencyCode: p.currencyCode,
              amount: p.amount,
              compareAtAmount: p.compareAtAmount ?? undefined,
              minQuantity: p.minQuantity,
              taxInclusive: p.taxInclusive,
            }))
          : [
              {
                currencyCode: 'EUR',
                amount: 0,
                compareAtAmount: undefined,
                minQuantity: 1,
                taxInclusive: true,
              },
            ],
      });
    }
  }, [variant, form]);

  const onSubmit = form.handleSubmit((values) => {
    if (!variant) return;
    updateMutation.mutate(
      {
        variantId: variant.id,
        body: {
          sku: values.sku,
          barcode: values.barcode || null,
          weight: values.weight ?? null,
          status: values.status,
          prices: values.prices,
        },
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
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="v-sku">SKU</FieldLabel>
                <Input
                  id="v-sku"
                  {...form.register('sku')}
                />
                <FieldError errors={[form.formState.errors.sku]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="v-barcode">Barcode</FieldLabel>
                <Input
                  id="v-barcode"
                  {...form.register('barcode')}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="v-weight">Weight (g)</FieldLabel>
                <Input
                  id="v-weight"
                  type="number"
                  {...form.register('weight', { valueAsNumber: true })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="v-status">Status</FieldLabel>
                <Select
                  value={form.watch('status')}
                  onValueChange={(v) =>
                    form.setValue('status', v as VariantFormValues['status'])
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
                <div
                  key={field.id}
                  className="rounded-lg border p-3"
                >
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
                      <Label className="text-xs text-muted-foreground">Amount (cents)</Label>
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
                          valueAsNumber: true,
                          setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
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
                        onCheckedChange={(v) =>
                          form.setValue(`prices.${index}.taxInclusive`, v)
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
