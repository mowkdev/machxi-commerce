// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProductDetailResponse } from '@repo/types/admin';
import { DefaultVariantCard } from '../components/DefaultVariantCard';

const updateMutation = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
}));

vi.mock('../hooks', () => ({
  useUpdateVariant: () => updateMutation,
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
        inventoryLevels: [],
        media: [],
      },
    ],
    media: [],
    categories: [],
    ...overrides,
  };
}

describe('DefaultVariantCard', () => {
  beforeEach(() => {
    updateMutation.mutate.mockReset();
    updateMutation.isPending = false;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders neutral product detail fields from the simple product record', () => {
    const { container } = render(<DefaultVariantCard product={makeProduct()} />);

    expect(screen.getByText('Product details')).toBeInTheDocument();
    expect(screen.getByLabelText('SKU')).toHaveValue('SIMPLE-001');
    expect(screen.getByLabelText('Barcode')).toHaveValue('123456789');
    expect(screen.getByLabelText('Weight (g)')).toHaveValue(250);
    expect(screen.getByDisplayValue('EUR')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1999')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/variant/i);
  });

  it('saves edited product detail values through the update mutation', async () => {
    const user = userEvent.setup();
    render(<DefaultVariantCard product={makeProduct()} />);

    await user.clear(screen.getByLabelText('SKU'));
    await user.type(screen.getByLabelText('SKU'), 'SIMPLE-002');
    await user.clear(screen.getByLabelText('Weight (g)'));
    await user.type(screen.getByLabelText('Weight (g)'), '300');
    await user.click(screen.getByRole('button', { name: 'Save details' }));

    await waitFor(() => {
      expect(updateMutation.mutate).toHaveBeenCalledWith({
        variantId: 'details-1',
        body: {
          sku: 'SIMPLE-002',
          barcode: '123456789',
          weight: 300,
          status: 'draft',
          prices: [
            {
              currencyCode: 'EUR',
              amount: 1999,
              compareAtAmount: undefined,
              minQuantity: 1,
              taxInclusive: true,
            },
          ],
        },
      });
    });
  });

  it('shows an unavailable state when no product details exist yet', () => {
    render(<DefaultVariantCard product={makeProduct({ variants: [] })} />);

    expect(screen.getByText('Product details')).toBeInTheDocument();
    expect(
      screen.getByText('Details are unavailable until this product is saved.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save details' })
    ).not.toBeInTheDocument();
  });
});
