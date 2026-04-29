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
import { categoriesQueryPrefix } from '@/features/categories/hooks';
import {
  adminListCategories,
  type AdminListCategoriesQueryParamsSortByEnumKey,
} from '@repo/admin-sdk';
import type { CategoryListItem } from '@repo/types/admin';

const columns: ColumnDef<CategoryListItem>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/categories/${row.original.id}`}
        className="font-medium text-foreground hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'handle',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Handle" />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">
        {row.original.handle}
      </span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'secondary' : 'outline'}>
        {row.original.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'rank',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Rank" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.rank}</span>
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

async function fetchCategories(params: DataGridQueryParams) {
  const res = await adminListCategories({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as
      | AdminListCategoriesQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
  });
  return { data: res.data, meta: res.meta };
}

export default function CategoriesPage() {
  return (
    <AppDataGrid<CategoryListItem>
      queryKey={categoriesQueryPrefix}
      columns={columns}
      fetcher={fetchCategories}
      searchPlaceholder="Search categories..."
      initialSort={[{ id: 'createdAt', desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/categories/new">
            <IconPlus />
            <span className="hidden lg:inline">New category</span>
          </Link>
        </Button>
      }
    />
  );
}
