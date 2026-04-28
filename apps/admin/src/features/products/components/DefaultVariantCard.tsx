import type {
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormReturn,
} from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ProductDetailVariant } from '@repo/types/admin';
import type { VariantFormValues } from '../schema';
import { VariantDetailsFields } from './VariantDetailsFields';

interface DefaultVariantCardProps {
  productDetails?: ProductDetailVariant | null;
  form: UseFormReturn<VariantFormValues, unknown, VariantFormValues>;
  priceFields: { id: string }[];
  appendPrice: UseFieldArrayAppend<VariantFormValues, 'prices'>;
  removePrice: UseFieldArrayRemove;
}

export function DefaultVariantCard({
  productDetails,
  form,
  priceFields,
  appendPrice,
  removePrice,
}: DefaultVariantCardProps) {
  if (!productDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product details</CardTitle>
          <CardDescription>
            Details are unavailable until this product is saved.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product details</CardTitle>
        <CardDescription>
          Manage SKU, pricing, and fulfillment details for this product.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <VariantDetailsFields
          form={form}
          priceFields={priceFields}
          appendPrice={appendPrice}
          removePrice={removePrice}
        />
      </CardContent>
    </Card>
  );
}
