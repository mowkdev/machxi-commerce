// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type {
  ProductDetailResponse,
  ProductDetailVariant,
} from '@repo/types/admin';
import { DefaultVariantCard } from '../components/DefaultVariantCard';
import { variantFormSchema, type VariantFormValues } from '../schema';
import {
  DEFAULT_VARIANT_FORM_VALUES,
  getVariantFormValues,
} from '../utils/variant-form';

function makeProduct(
  overrides: Partial<ProductDetailResponse> = {}
): ProductDetailResponse {
  return {
    id: 'product-1',
    baseSku: 'BASE-1',
    status: 'draft',
    type: 'simple',
    taxClassId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: [
      {
        id: 'translation-1',
        languageCode: 'en',
        name: 'Simple product',
        description: null,
        handle: 'simple-product',
      },
    ],
    options: [],
    variants: [
      {
        id: 'details-1',
        sku: 'SIMPLE-001',
        status: 'draft',
        weight: 250,
        barcode: '123456789',
        priceSetId: 'price-set-1',
        inventoryItemId: 'inventory-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        optionValues: [],
        prices: [
          {
            id: 'price-1',
            currencyCode: 'EUR',
            amount: 1999,
            compareAtAmount: null,
            minQuantity: 1,
            taxInclusive: true,
          },
        ],
        inventoryLevels: [],
        media: [],
      },
    ],
    media: [],
    categories: [],
    ...overrides,
  };
}

function TestDefaultVariantCard({
  productDetails,
}: {
  productDetails?: ProductDetailVariant | null;
}) {
  const form = useForm<VariantFormValues, unknown, VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: productDetails
      ? getVariantFormValues(productDetails)
      : DEFAULT_VARIANT_FORM_VALUES,
  });
  const { fields: priceFields, append: appendPrice, remove: removePrice } =
    useFieldArray({ control: form.control, name: 'prices' });

  return (
    <DefaultVariantCard
      productDetails={productDetails}
      form={form}
      priceFields={priceFields}
      appendPrice={appendPrice}
      removePrice={removePrice}
    />
  );
}

describe('DefaultVariantCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders neutral product detail fields from the simple product record', () => {
    const product = makeProduct();
    const { container } = render(
      <TestDefaultVariantCard productDetails={product.variants[0]} />
    );

    expect(screen.getByText('Product details')).toBeInTheDocument();
    expect(screen.getByLabelText('SKU')).toHaveValue('SIMPLE-001');
    expect(screen.getByLabelText('Barcode')).toHaveValue('123456789');
    expect(screen.getByLabelText('Weight (g)')).toHaveValue(250);
    expect(screen.getByDisplayValue('EUR')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1999')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/variant/i);
  });

  it('does not render a separate details save button', () => {
    const product = makeProduct();
    render(<TestDefaultVariantCard productDetails={product.variants[0]} />);

    expect(
      screen.queryByRole('button', { name: 'Save details' })
    ).not.toBeInTheDocument();
  });

  it('shows an unavailable state when no product details exist yet', () => {
    render(<TestDefaultVariantCard productDetails={null} />);

    expect(screen.getByText('Product details')).toBeInTheDocument();
    expect(
      screen.getByText('Details are unavailable until this product is saved.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save details' })
    ).not.toBeInTheDocument();
  });
});
