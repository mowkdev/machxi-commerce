// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
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

vi.mock('@/features/stock-locations/hooks', () => ({
  useStockLocationOptions: () => ({
    data: [
      {
        id: 'location-1',
        name: 'Main warehouse',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'location-2',
        name: 'Overflow warehouse',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    isPending: false,
    isError: false,
  }),
}));

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
        inventoryLevels: [
          {
            locationId: 'location-1',
            stockedQuantity: 7,
          },
        ],
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
    resolver: zodResolver(variantFormSchema) as Resolver<
      VariantFormValues,
      unknown,
      VariantFormValues
    >,
    defaultValues: productDetails
      ? getVariantFormValues(productDetails)
      : DEFAULT_VARIANT_FORM_VALUES,
  });
  const { fields: priceFields, append: appendPrice, remove: removePrice } =
    useFieldArray({ control: form.control, name: 'prices' });

  return (
    <DefaultVariantCard
      productId="product-1"
      productDetails={productDetails}
      form={form}
      priceFields={priceFields}
      appendPrice={appendPrice}
      removePrice={removePrice}
    />
  );
}

describe('DefaultVariantCard', () => {
  function renderWithQueryClient(ui: ReactElement) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders neutral product detail fields from the simple product record', () => {
    const product = makeProduct();
    renderWithQueryClient(
      <TestDefaultVariantCard productDetails={product.variants[0]} />
    );

    expect(screen.getByText('Product details')).toBeInTheDocument();
    expect(screen.getByLabelText('SKU')).toHaveValue('SIMPLE-001');
    expect(screen.getByLabelText('Barcode')).toHaveValue('123456789');
    expect(screen.getByLabelText('Weight (g)')).toHaveValue(250);
    expect(screen.getByDisplayValue('EUR')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1999')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('Main warehouse')).toBeInTheDocument();
    expect(screen.getByText('Stock: 7')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open actions for Main warehouse' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adjust' })).not.toBeInTheDocument();
    expect(screen.getByText('Overflow warehouse')).toBeInTheDocument();
    expect(screen.getByText('Not assigned')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assign' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save details' })
    ).not.toBeInTheDocument();
  });

  it('does not render a separate details save button', () => {
    const product = makeProduct();
    renderWithQueryClient(
      <TestDefaultVariantCard productDetails={product.variants[0]} />
    );

    expect(
      screen.queryByRole('button', { name: 'Save details' })
    ).not.toBeInTheDocument();
  });

  it('shows an unavailable state when no product details exist yet', () => {
    renderWithQueryClient(<TestDefaultVariantCard productDetails={null} />);

    expect(screen.getByText('Product details')).toBeInTheDocument();
    expect(
      screen.getByText('Details are unavailable until this product is saved.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save details' })
    ).not.toBeInTheDocument();
  });
});
