import { IconPlus } from '@tabler/icons-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridQueryParams,
} from '@/components/app-data-grid';
import { Button } from '@/components/ui/button';
import { stockLocationsQueryPrefix } from '@/features/stock-locations/hooks';
import {
  adminListStockLocations,
  type AdminListStockLocationsQueryParamsSortByEnumKey,
} from '@repo/admin-sdk';
import type { StockLocationListItem } from '@repo/types/admin';

const columns: ColumnDef<StockLocationListItem>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/stock-locations/${row.original.id}`}
        className="font-medium text-foreground hover:underline"
      >
        {row.original.name}
      </Link>
    ),
    enableSorting: false,
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
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </span>
    ),
  },
];

async function fetchStockLocations(params: DataGridQueryParams) {
  const res = await adminListStockLocations({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as
      | AdminListStockLocationsQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
  });
  return { data: res.data, meta: res.meta };
}

export default function StockLocationsPage() {
  return (
    <AppDataGrid<StockLocationListItem>
      queryKey={stockLocationsQueryPrefix}
      columns={columns}
      fetcher={fetchStockLocations}
      searchPlaceholder="Search stock locations..."
      initialSort={[{ id: 'createdAt', desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/stock-locations/new">
            <IconPlus />
            <span className="hidden lg:inline">New stock location</span>
          </Link>
        </Button>
      }
    />
  );
}
