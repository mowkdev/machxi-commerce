import { IconPlus } from '@tabler/icons-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridFilterDef,
  type DataGridQueryParams,
} from '@/components/app-data-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { priceListsQueryPrefix } from '@/features/price-lists/hooks';
import {
  adminListPriceLists,
  type AdminListPriceListsQueryParamsSortByEnumKey,
  type AdminListPriceListsQueryParamsStatusEnumKey,
  type AdminListPriceListsQueryParamsTypeEnumKey,
} from '@repo/admin-sdk';
import type { PriceListListItem } from '@repo/types/admin';

const STATUS_VARIANTS: Record<PriceListListItem['status'], 'default' | 'secondary'> = {
  active: 'default',
  draft: 'secondary',
};

const filters: DataGridFilterDef[] = [
  {
    id: 'status',
    label: 'Status',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'active', label: 'Active' },
    ],
  },
  {
    id: 'type',
    label: 'Type',
    options: [
      { value: 'sale', label: 'Sale' },
      { value: 'override', label: 'Override' },
    ],
  },
];

const columns: ColumnDef<PriceListListItem>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/price-lists/${row.original.id}`}
        className="flex flex-col hover:underline"
      >
        <span className="font-medium text-foreground">{row.original.name}</span>
        {row.original.description ? (
          <span className="text-xs text-muted-foreground">
            {row.original.description}
          </span>
        ) : null}
      </Link>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANTS[row.original.status]} className="capitalize">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'type',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => <span className="capitalize">{row.original.type}</span>,
  },
  {
    accessorKey: 'priceCount',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Prices" />
    ),
    cell: ({ row }) => row.original.priceCount,
    enableSorting: false,
  },
  {
    accessorKey: 'startsAt',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Starts" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.startsAt
          ? new Date(row.original.startsAt).toLocaleDateString()
          : 'Always'}
      </span>
    ),
  },
  {
    accessorKey: 'endsAt',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Ends" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.endsAt
          ? new Date(row.original.endsAt).toLocaleDateString()
          : 'No end'}
      </span>
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
];

async function fetchPriceLists(params: DataGridQueryParams) {
  const res = await adminListPriceLists({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as
      | AdminListPriceListsQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
    status: params.filters.status as
      | AdminListPriceListsQueryParamsStatusEnumKey
      | undefined,
    type: params.filters.type as
      | AdminListPriceListsQueryParamsTypeEnumKey
      | undefined,
  });
  return { data: res.data, meta: res.meta };
}

export default function PriceListsPage() {
  return (
    <AppDataGrid<PriceListListItem>
      queryKey={priceListsQueryPrefix}
      columns={columns}
      fetcher={fetchPriceLists}
      searchPlaceholder="Search price lists…"
      filters={filters}
      initialSort={[{ id: 'createdAt', desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/price-lists/new">
            <IconPlus />
            <span className="hidden lg:inline">New price list</span>
          </Link>
        </Button>
      }
    />
  );
}
