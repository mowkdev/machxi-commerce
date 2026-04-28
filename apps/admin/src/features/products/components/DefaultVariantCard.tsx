import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ProductDetailResponse } from '@repo/types/admin';
import { useUpdateVariant } from '../hooks';
import { variantFormSchema, type VariantFormValues } from '../schema';
import {
  DEFAULT_VARIANT_FORM_VALUES,
  getUpdateVariantBody,
  getVariantFormValues,
} from '../utils/variant-form';
import { VariantDetailsFields } from './VariantDetailsFields';

interface DefaultVariantCardProps {
  product: ProductDetailResponse;
}

export function DefaultVariantCard({ product }: DefaultVariantCardProps) {
  const productDetails =
    product.variants.find((variant) => variant.optionValues.length === 0) ??
    product.variants[0];
  const updateMutation = useUpdateVariant(product.id);

  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: productDetails
      ? getVariantFormValues(productDetails)
      : DEFAULT_VARIANT_FORM_VALUES,
  });

  const { fields: priceFields, append: appendPrice, remove: removePrice } =
    useFieldArray({ control: form.control, name: 'prices' });

  useEffect(() => {
    form.reset(
      productDetails
        ? getVariantFormValues(productDetails)
        : DEFAULT_VARIANT_FORM_VALUES
    );
  }, [productDetails, form]);

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

  const onSubmit = form.handleSubmit((values) => {
    updateMutation.mutate({
      variantId: productDetails.id,
      body: getUpdateVariantBody(values),
    });
  });

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
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save details'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
