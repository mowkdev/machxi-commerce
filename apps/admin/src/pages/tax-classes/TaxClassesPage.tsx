import { IconPlus } from '@tabler/icons-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridQueryParams,
} from '@/components/app-data-grid';
import { Button } from '@/components/ui/button';
import { taxClassesQueryPrefix } from '@/features/tax-classes/hooks';
import {
  adminListTaxClasses,
  type AdminListTaxClassesQueryParamsSortByEnumKey,
} from '@repo/admin-sdk';
import type { TaxClassListItem } from '@repo/types/admin';

const columns: ColumnDef<TaxClassListItem>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/tax-classes/${row.original.id}`}
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

async function fetchTaxClasses(params: DataGridQueryParams) {
  const res = await adminListTaxClasses({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as
      | AdminListTaxClassesQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
  });
  return { data: res.data, meta: res.meta };
}

export default function TaxClassesPage() {
  return (
    <AppDataGrid<TaxClassListItem>
      queryKey={taxClassesQueryPrefix}
      columns={columns}
      fetcher={fetchTaxClasses}
      searchPlaceholder="Search tax classes…"
      initialSort={[{ id: 'createdAt', desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/tax-classes/new">
            <IconPlus />
            <span className="hidden lg:inline">New tax class</span>
          </Link>
        </Button>
      }
    />
  );
}
