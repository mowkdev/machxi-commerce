import { IconPlus } from '@tabler/icons-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

import {
  AppDataGrid,
  DataGridColumnHeader,
} from '@/components/app-data-grid';
import { Button } from '@/components/ui/button';
import {
  listTaxClasses,
  taxClassesKeys,
  type TaxClassListItem,
} from '@/features/tax-classes/api';

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

export default function TaxClassesPage() {
  return (
    <AppDataGrid<TaxClassListItem>
      queryKey={taxClassesKeys.list()}
      columns={columns}
      fetcher={listTaxClasses}
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
