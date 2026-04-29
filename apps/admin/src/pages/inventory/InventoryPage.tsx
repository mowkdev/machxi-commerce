import { useMemo, useState } from 'react';
import { IconDotsVertical } from '@tabler/icons-react';
import type { ColumnDef } from '@tanstack/react-table';

import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridFilterDef,
  type DataGridQueryParams,
} from '@/components/app-data-grid';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BulkRemoveInventoryLevelsDialog } from '@/features/inventory/components/BulkRemoveInventoryLevelsDialog';
import {
  InventoryAssignmentDialog,
  type InventoryAssignmentItem,
} from '@/features/inventory/components/InventoryAssignmentDialog';
import {
  InventoryAdjustmentDialog,
  type InventoryAdjustmentTarget,
} from '@/features/inventory/components/InventoryAdjustmentDialog';
import { InventoryTransferDialog } from '@/features/inventory/components/InventoryTransferDialog';
import { RemoveInventoryLevelDialog } from '@/features/inventory/components/RemoveInventoryLevelDialog';
import { inventoryLevelsQueryPrefix } from '@/features/inventory/hooks';
import { useStockLocationOptions } from '@/features/stock-locations/hooks';
import {
  adminListInventoryLevels,
  type AdminListInventoryLevels200,
  type AdminListInventoryLevelsQueryParamsSortByEnumKey,
} from '@repo/admin-sdk';

type InventoryLevelRow = AdminListInventoryLevels200['data'][number];

function getInventoryRowId(row: InventoryLevelRow) {
  return `${row.inventoryItemId}:${row.locationId}`;
}

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
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false);
  const [isBulkRemoveOpen, setIsBulkRemoveOpen] = useState(false);
  const [adjustmentRow, setAdjustmentRow] = useState<InventoryLevelRow | null>(null);
  const [transferRow, setTransferRow] = useState<InventoryLevelRow | null>(null);
  const [removeRow, setRemoveRow] = useState<InventoryLevelRow | null>(null);
  const [selectedRows, setSelectedRows] = useState<Record<string, InventoryLevelRow>>({});
  const { data: stockLocations } = useStockLocationOptions();
  const selectedRowList = useMemo(() => Object.values(selectedRows), [selectedRows]);
  const selectedInventoryItems = useMemo<InventoryAssignmentItem[]>(
    () =>
      Array.from(
        new Map(
          selectedRowList.map((row) => [
            row.inventoryItemId,
            {
              inventoryItemId: row.inventoryItemId,
              productName: row.productName,
              sku: row.sku,
            },
          ])
        ).values()
      ),
    [selectedRowList]
  );
  const canBulkRemove =
    selectedRowList.length > 0 && selectedRowList.every((row) => row.stockedQuantity === 0);

  const setRowSelected = (row: InventoryLevelRow, selected: boolean) => {
    setSelectedRows((prev) => {
      const key = getInventoryRowId(row);
      if (selected) return { ...prev, [key]: row };

      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

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
        id: 'select',
        header: ({ table }) => {
          const pageRows = table.getRowModel().rows.map((row) => row.original);
          const selectedCount = pageRows.filter(
            (row) => selectedRows[getInventoryRowId(row)]
          ).length;
          const checked =
            pageRows.length > 0 && selectedCount === pageRows.length
              ? true
              : selectedCount > 0
              ? 'indeterminate'
              : false;

          return (
            <Checkbox
              checked={checked}
              aria-label="Select all inventory rows"
              onCheckedChange={(value) => {
                const shouldSelect = value === true;
                setSelectedRows((prev) => {
                  const next = { ...prev };
                  for (const row of pageRows) {
                    const key = getInventoryRowId(row);
                    if (shouldSelect) next[key] = row;
                    else delete next[key];
                  }
                  return next;
                });
              }}
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={Boolean(selectedRows[getInventoryRowId(row.original)])}
            aria-label={`Select ${row.original.sku} at ${row.original.locationName}`}
            onCheckedChange={(value) => setRowSelected(row.original, value === true)}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
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
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                aria-label={`Open actions for ${row.original.sku}`}
                className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
              >
                <IconDotsVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setAdjustmentRow(row.original)}>
                  Adjust
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={row.original.stockedQuantity === 0}
                  onSelect={() => setTransferRow(row.original)}
                >
                  Transfer
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setRemoveRow(row.original)}
                >
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [selectedRows]
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
        getRowId={getInventoryRowId}
        emptyState="No inventory items found."
        toolbarActions={
          <>
            {selectedRowList.length > 0 ? (
              <Button
                size="sm"
                variant="destructive"
                disabled={!canBulkRemove}
                title={
                  canBulkRemove
                    ? undefined
                    : 'Selected inventory assignments must have zero stock before removal.'
                }
                onClick={() => setIsBulkRemoveOpen(true)}
              >
                Remove selected ({selectedRowList.length})
              </Button>
            ) : null}
            <Button size="sm" onClick={() => setIsAssignmentOpen(true)}>
              Assign inventory to location
            </Button>
          </>
        }
      />
      <InventoryAssignmentDialog
        open={isAssignmentOpen}
        onOpenChange={setIsAssignmentOpen}
        selectedItems={selectedInventoryItems}
        onSelectedItemsChange={(items) => {
          const selectedInventoryItemIds = new Set(
            items.map((item) => item.inventoryItemId)
          );
          setSelectedRows((current) => {
            const next: typeof current = {};
            for (const [key, row] of Object.entries(current)) {
              if (selectedInventoryItemIds.has(row.inventoryItemId)) {
                next[key] = row;
              }
            }
            return next;
          });
        }}
        onAssigned={() => setSelectedRows({})}
      />
      <BulkRemoveInventoryLevelsDialog
        rows={selectedRowList as InventoryAdjustmentTarget[]}
        open={isBulkRemoveOpen}
        onOpenChange={setIsBulkRemoveOpen}
        onRemoved={() => setSelectedRows({})}
      />
      <InventoryAdjustmentDialog
        row={adjustmentRow}
        open={!!adjustmentRow}
        onOpenChange={(open) => {
          if (!open) setAdjustmentRow(null);
        }}
      />
      <InventoryTransferDialog
        row={transferRow}
        open={!!transferRow}
        onOpenChange={(open) => {
          if (!open) setTransferRow(null);
        }}
      />
      <RemoveInventoryLevelDialog
        row={removeRow}
        open={!!removeRow}
        onOpenChange={(open) => {
          if (!open) setRemoveRow(null);
        }}
      />
    </>
  );
}
