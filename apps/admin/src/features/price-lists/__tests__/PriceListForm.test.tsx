// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentProps } from 'react';
import { PriceListForm } from '../components/PriceListForm';

const mutations = vi.hoisted(() => ({
  create: { mutate: vi.fn(), isPending: false },
  update: { mutate: vi.fn(), isPending: false },
  deleteList: { mutate: vi.fn(), isPending: false },
  createPrice: { mutate: vi.fn(), isPending: false },
  updatePrice: { mutate: vi.fn(), isPending: false },
  deletePrice: { mutate: vi.fn(), isPending: false },
}));

const priceSetTargets = vi.hoisted(() => [
  {
    priceSetId: '33333333-3333-4333-8333-333333333333',
    productId: '44444444-4444-4444-8444-444444444444',
    productName: 'Blue Shirt',
    productHandle: 'blue-shirt',
    variantId: '55555555-5555-4555-8555-555555555555',
    sku: 'BLUE-SHIRT',
    status: 'published',
    basePrices: [
      {
        currencyCode: 'USD',
        amount: 2500,
        compareAtAmount: null,
        minQuantity: 1,
        taxInclusive: false,
      },
    ],
  },
]);

vi.mock('../hooks', () => ({
  useCreatePriceList: () => mutations.create,
  useUpdatePriceList: () => mutations.update,
  useDeletePriceList: () => mutations.deleteList,
  useCreatePriceListPrice: () => mutations.createPrice,
  useUpdatePriceListPrice: () => mutations.updatePrice,
  useDeletePriceListPrice: () => mutations.deletePrice,
  usePriceSetTargets: () => ({ data: priceSetTargets, isPending: false }),
}));

function renderForm(props: ComponentProps<typeof PriceListForm>) {
  return render(
    <MemoryRouter>
      <PriceListForm {...props} />
    </MemoryRouter>
  );
}

const priceList = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'draft',
  type: 'sale',
  startsAt: null,
  endsAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  translations: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      priceListId: '11111111-1111-4111-8111-111111111111',
      languageCode: 'en',
      name: 'Summer sale',
      description: 'Seasonal discounts',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  prices: [
    {
      id: '66666666-6666-4666-8666-666666666666',
      priceListId: '11111111-1111-4111-8111-111111111111',
      priceSetId: '33333333-3333-4333-8333-333333333333',
      currencyCode: 'USD',
      amount: 1999,
      minQuantity: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
} as const;

describe('PriceListForm', () => {
  beforeEach(() => {
    Object.values(mutations).forEach((mutation) => {
      mutation.mutate.mockReset();
      mutation.isPending = false;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders existing price overrides in edit mode', () => {
    renderForm({ mode: 'edit', initialData: priceList });

    expect(screen.getByText('Prices (1)')).toBeInTheDocument();
    expect(screen.getByText('Blue Shirt / BLUE-SHIRT')).toBeInTheDocument();
    expect(screen.getByText('1,999 USD')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add price' })).toBeInTheDocument();
    expect(screen.getByText('Danger zone')).toBeInTheDocument();
  });

  it('opens the price editor sheet from a grid row', async () => {
    const user = userEvent.setup();
    renderForm({ mode: 'edit', initialData: priceList });

    await user.click(screen.getByText('Blue Shirt / BLUE-SHIRT'));

    expect(screen.getByText('Edit price override')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save price' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete price' })).toBeInTheDocument();
  });

  it('submits the create form with a default translation', async () => {
    const user = userEvent.setup();
    renderForm({ mode: 'create' });

    await user.type(screen.getByLabelText('Name'), 'Black Friday');
    await user.type(screen.getByLabelText('Description'), 'Short sale');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mutations.create.mutate).toHaveBeenCalledWith({
        status: 'draft',
        type: 'sale',
        startsAt: null,
        endsAt: null,
        translations: [
          {
            languageCode: 'en',
            name: 'Black Friday',
            description: 'Short sale',
          },
        ],
        prices: [],
      });
    });
  });
});
