// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  ProductDetailResponse,
  ProductDetailVariant,
} from '@repo/types/admin';
import { VariantsTable } from '../components/VariantsTable';

vi.mock('../components/VariantEditDrawer', () => ({
  VariantEditDrawer: ({
    variant,
    open,
  }: {
    variant: ProductDetailVariant | null;
    open: boolean;
  }) =>
    open && variant ? (
      <div data-testid="variant-drawer">
        {variant.sku} media count: {variant.media.length}
      </div>
    ) : null,
}));

function makeVariant(overrides: Partial<ProductDetailVariant> = {}): ProductDetailVariant {
  return {
    id: 'variant-1',
    sku: 'VAR-1',
    status: 'draft',
    weight: null,
    barcode: null,
    priceSetId: 'price-set-1',
    inventoryItemId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    optionValues: [],
    prices: [
      {
        id: 'price-1',
        currencyCode: 'EUR',
        amount: 1000,
        compareAtAmount: null,
        minQuantity: 1,
        taxInclusive: true,
      },
    ],
    inventoryLevels: [],
    media: [],
    ...overrides,
  };
}

function makeProduct(variant: ProductDetailVariant): ProductDetailResponse {
  return {
    id: 'product-1',
    baseSku: 'BASE-1',
    status: 'draft',
    type: 'variable',
    taxClassId: 'tax-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: [],
    options: [],
    variants: [variant],
    media: [],
    categories: [],
  };
}

describe('VariantsTable', () => {
  it('keeps the open drawer synced with refreshed variant data', async () => {
    const user = userEvent.setup();
    const initialVariant = makeVariant();
    const { rerender } = render(<VariantsTable product={makeProduct(initialVariant)} />);

    await user.click(screen.getAllByText('VAR-1')[0]);
    expect(screen.getByTestId('variant-drawer')).toHaveTextContent('media count: 0');

    const refreshedVariant = makeVariant({
      media: [
        {
          mediaId: '11111111-1111-4111-8111-111111111111',
          rank: 0,
          media: {
            id: '11111111-1111-4111-8111-111111111111',
            url: '/media/image.jpg',
            mimeType: 'image/jpeg',
            altText: 'Image',
          },
        },
      ],
    });
    rerender(<VariantsTable product={makeProduct(refreshedVariant)} />);

    expect(screen.getByTestId('variant-drawer')).toHaveTextContent('media count: 1');
  });
});
