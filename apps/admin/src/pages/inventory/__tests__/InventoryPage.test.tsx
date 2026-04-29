// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InventoryPage from '../InventoryPage';

const { inventoryRows } = vi.hoisted(() => ({
  inventoryRows: [
  {
    inventoryItemId: '11111111-1111-4111-8111-111111111111',
    productId: '21111111-1111-4111-8111-111111111111',
    productName: 'Zero stock product',
    variantId: '31111111-1111-4111-8111-111111111111',
    sku: 'ZERO-1',
    locationId: '41111111-1111-4111-8111-111111111111',
    locationName: 'Main warehouse',
    stockedQuantity: 0,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    inventoryItemId: '55555555-5555-4555-8555-555555555555',
    productId: '65555555-5555-4555-8555-555555555555',
    productName: 'Stocked product',
    variantId: '75555555-5555-4555-8555-555555555555',
    sku: 'STOCK-1',
    locationId: '85555555-5555-4555-8555-555555555555',
    locationName: 'Overflow warehouse',
    stockedQuantity: 3,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  ],
}));

vi.mock('@repo/admin-sdk', () => ({
  adminListInventoryLevels: vi.fn(async () => ({
    success: true,
    data: inventoryRows,
    meta: {
      page: 1,
      pageSize: 20,
      totalPages: 1,
      totalItems: inventoryRows.length,
    },
  })),
  adminDeleteInventoryLevel: vi.fn(async () => ({
    success: true,
    data: {
      inventoryItemId: inventoryRows[0].inventoryItemId,
      locationId: inventoryRows[0].locationId,
      deleted: true,
    },
  })),
  adminCreateInventoryAdjustment: vi.fn(),
  adminCreateInventoryLevel: vi.fn(async () => ({
    success: true,
    data: {
      inventoryItemId: inventoryRows[0].inventoryItemId,
      locationId: inventoryRows[0].locationId,
      stockedQuantity: 0,
    },
  })),
  adminCreateInventoryTransfer: vi.fn(),
  adminListInventoryLevelsQueryKey: () => [{ url: '/api/inventory' }],
  adminListInventoryTransactionsQueryKey: () => [{ url: '/api/inventory/transactions' }],
  useAdminListInventoryItems: () => ({
    data: [],
    isPending: false,
    isError: false,
  }),
}));

vi.mock('@/features/stock-locations/hooks', () => ({
  useStockLocationOptions: () => ({
    data: [
      {
        id: '41111111-1111-4111-8111-111111111111',
        name: 'Main warehouse',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '85555555-5555-4555-8555-555555555555',
        name: 'Overflow warehouse',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  }),
}));

function renderInventoryPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <InventoryPage />
    </QueryClientProvider>
  );
}

describe('InventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders row selection and dots menu actions', async () => {
    const user = userEvent.setup();
    renderInventoryPage();

    expect(await screen.findByText('Zero stock product')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Select ZERO-1 at Main warehouse' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open actions for ZERO-1' }));

    expect(screen.getByRole('menuitem', { name: 'Adjust' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Transfer' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Remove' })).toBeInTheDocument();
  });

  it('enables bulk remove only for selected zero-stock rows', async () => {
    const user = userEvent.setup();
    renderInventoryPage();

    await screen.findByText('Zero stock product');

    await user.click(
      await screen.findByRole('checkbox', { name: 'Select ZERO-1 at Main warehouse' })
    );
    expect(
      screen.getByRole('button', { name: 'Remove selected (1)' })
    ).toBeEnabled();

    await user.click(
      await screen.findByRole('checkbox', { name: 'Select STOCK-1 at Overflow warehouse' })
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Remove selected (2)' })
      ).toBeDisabled();
    });
  });

  it('shows selected inventory items as removable badges in assignment dialog', async () => {
    const user = userEvent.setup();
    renderInventoryPage();

    await screen.findByText('Zero stock product');

    await user.click(
      await screen.findByRole('checkbox', { name: 'Select ZERO-1 at Main warehouse' })
    );
    await user.click(screen.getByRole('button', { name: 'Assign inventory to location' }));

    const dialog = screen.getByRole('dialog', { name: 'Assign inventory to location' });
    expect(within(dialog).getByText(/Zero stock product/)).toBeInTheDocument();
    expect(within(dialog).getByText('ZERO-1')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Remove ZERO-1 from assignment' })
    ).toBeInTheDocument();
    expect(within(dialog).queryByText('Select an inventory item')).not.toBeInTheDocument();
  });
});
