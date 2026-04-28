import type { ProductDetailVariant, UpdateVariantBody } from '@repo/types/admin';
import type { VariantFormValues } from '../schema';

export const DEFAULT_VARIANT_FORM_VALUES: VariantFormValues = {
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
};

export function getVariantFormValues(
  variant?: ProductDetailVariant | null
): VariantFormValues {
  if (!variant) return DEFAULT_VARIANT_FORM_VALUES;

  return {
    sku: variant.sku,
    barcode: variant.barcode ?? '',
    weight: variant.weight ?? undefined,
    status: variant.status as VariantFormValues['status'],
    prices: variant.prices.length > 0
      ? variant.prices.map((price) => ({
          currencyCode: price.currencyCode,
          amount: price.amount,
          compareAtAmount: price.compareAtAmount ?? undefined,
          minQuantity: price.minQuantity,
          taxInclusive: price.taxInclusive,
        }))
      : DEFAULT_VARIANT_FORM_VALUES.prices,
  };
}

export function getUpdateVariantBody(values: VariantFormValues): UpdateVariantBody {
  return {
    sku: values.sku,
    barcode: values.barcode || null,
    weight: values.weight ?? null,
    status: values.status,
    prices: values.prices,
  };
}
