import { IconPlus } from '@tabler/icons-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridQueryParams,
} from '@/components/app-data-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { optionDefinitionsQueryPrefix } from '@/features/option-definitions/hooks';
import {
  adminListOptionDefinitionsCatalog,
  type AdminListOptionDefinitionsCatalog200,
  type AdminListOptionDefinitionsCatalogQueryParamsSortByEnumKey,
} from '@repo/admin-sdk';

type OptionDefListItem = AdminListOptionDefinitionsCatalog200['data'][number];

const columns: ColumnDef<OptionDefListItem>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/options/${row.original.id}`}
        className="font-medium text-foreground hover:underline"
      >
        {row.original.name ?? row.original.code}
      </Link>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'code',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Code" />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.code}
      </span>
    ),
  },
  {
    accessorKey: 'valuesCount',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Values" />
    ),
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.valuesCount}</Badge>
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

async function fetchOptionDefinitions(params: DataGridQueryParams) {
  const res = await adminListOptionDefinitionsCatalog({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as
      | AdminListOptionDefinitionsCatalogQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
  });
  return { data: res.data, meta: res.meta };
}

export default function OptionDefinitionsPage() {
  return (
    <AppDataGrid<OptionDefListItem>
      queryKey={optionDefinitionsQueryPrefix}
      columns={columns}
      fetcher={fetchOptionDefinitions}
      searchPlaceholder="Search options by name or code…"
      initialSort={[{ id: 'createdAt', desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/options/new">
            <IconPlus />
            <span className="hidden lg:inline">New option</span>
          </Link>
        </Button>
      }
    />
  );
}
