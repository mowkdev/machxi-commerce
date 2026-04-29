import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridFilterDef,
  type DataGridQueryParams,
} from '@/components/app-data-grid';
import { Button } from '@/components/ui/button';
import { InventoryAdjustmentDialog } from '@/features/inventory/components/InventoryAdjustmentDialog';
import { inventoryLevelsQueryPrefix } from '@/features/inventory/hooks';
import { useStockLocationOptions } from '@/features/stock-locations/hooks';
import {
  adminListInventoryLevels,
  type AdminListInventoryLevels200,
  type AdminListInventoryLevelsQueryParamsSortByEnumKey,
} from '@repo/admin-sdk';

type InventoryLevelRow = AdminListInventoryLevels200['data'][number];

async function fetchInventoryLevels(params: DataGridQueryParams) {
  const res = await adminListInventoryLevels({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    locationId: params.filters.locationId,
    sortBy: params.sortBy as
      | AdminListInventoryLevelsQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
  });
  return { data: res.data, meta: res.meta };
}

export default function InventoryPage() {
  const [adjustmentRow, setAdjustmentRow] = useState<InventoryLevelRow | null>(null);
  const { data: stockLocations } = useStockLocationOptions();

  const filters = useMemo<DataGridFilterDef[]>(() => {
    if (!stockLocations?.length) return [];

    return [
      {
        id: 'locationId',
        label: 'Locations',
        options: stockLocations.map((location) => ({
          value: location.id,
          label: location.name,
        })),
      },
    ];
  }, [stockLocations]);

  const columns = useMemo<ColumnDef<InventoryLevelRow>[]>(
    () => [
      {
        accessorKey: 'productName',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Product" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {row.original.productName ?? 'Untitled product'}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {row.original.sku}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'locationName',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Location" />
        ),
        cell: ({ row }) => row.original.locationName,
      },
      {
        accessorKey: 'stockedQuantity',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Stocked" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.stockedQuantity}</span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Updated" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.original.updatedAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdjustmentRow(row.original)}
            >
              Adjust
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    []
  );

  return (
    <>
      <AppDataGrid<InventoryLevelRow>
        queryKey={inventoryLevelsQueryPrefix}
        columns={columns}
        fetcher={fetchInventoryLevels}
        searchPlaceholder="Search inventory by product, SKU, or location..."
        filters={filters}
        initialSort={[{ id: 'updatedAt', desc: true }]}
        getRowId={(row) => `${row.inventoryItemId}:${row.locationId}`}
        emptyState="No inventory items found."
      />
      <InventoryAdjustmentDialog
        row={adjustmentRow}
        open={!!adjustmentRow}
        onOpenChange={(open) => {
          if (!open) setAdjustmentRow(null);
        }}
      />
    </>
  );
}
