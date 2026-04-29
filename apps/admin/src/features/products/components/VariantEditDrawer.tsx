import { SidePanelForm } from '@/components/side-panel-form';
import { Badge } from '@/components/ui/badge';
import type { ProductDetailVariant } from '@repo/types/admin';
import { useUpdateVariant } from '../hooks';
import { useVariantForm } from '../hooks/useVariantForm';
import { getUpdateVariantBody, getVariantLabel } from '../utils/variant-form';
import { ProductMediaManager } from './ProductMediaManager';
import { VariantDetailsFields } from './VariantDetailsFields';
import { VariantInventoryCard } from './VariantInventoryCard';

interface VariantEditDrawerProps {
  productId: string;
  variant: ProductDetailVariant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VariantEditDrawer({
  productId,
  variant,
  open,
  onOpenChange,
}: VariantEditDrawerProps) {
  const updateMutation = useUpdateVariant(productId);
  const { form, priceFields, appendPrice, removePrice } = useVariantForm(variant);

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
    <SidePanelForm
      open={open}
      onOpenChange={onOpenChange}
      title="Edit variant"
      description={
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
      }
      formId="variant-form"
      onSubmit={onSubmit}
      submitLabel={updateMutation.isPending ? 'Saving...' : 'Save variant'}
      isSubmitting={updateMutation.isPending}
    >
      <VariantDetailsFields
        form={form}
        priceFields={priceFields}
        appendPrice={appendPrice}
        removePrice={removePrice}
      />
      <VariantInventoryCard productId={productId} variant={variant} />
      <ProductMediaManager
        title="Variant media"
        description="Images specific to this variant."
        media={variant.media}
        target={{ type: 'variant', productId, variantId: variant.id }}
      />
    </SidePanelForm>
  );
}
