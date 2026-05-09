import {
  adminListPages,
  type AdminListPages200,
  type AdminListPagesQueryParamsSortByEnumKey,
  type AdminListPagesQueryParamsStatusEnumKey,
} from '@repo/admin-sdk';
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
import { cmsPagesQueryPrefix } from '@/features/cms-pages/hooks';

type PageItem = AdminListPages200['data'][number];

const STATUS_VARIANTS: Record<
  PageItem['status'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  published: 'default',
  draft: 'secondary',
  archived: 'outline',
  deleted: 'destructive',
};

const statusFilter: DataGridFilterDef = {
  id: 'status',
  label: 'Status',
  options: [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ],
};

const columns: ColumnDef<PageItem>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Title" />,
    cell: ({ row }) => (
      <Link to={`/cms/pages/${row.original.id}`} className="flex flex-col hover:underline">
        <span className="font-medium text-foreground">
          {row.original.title ?? '—'}
        </span>
        <span className="text-xs text-muted-foreground">
          /{row.original.pathSegments.join('/') || row.original.handle || ''}
        </span>
      </Link>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANTS[row.original.status]} className="capitalize">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'childCount',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Children" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.childCount}</span>
    ),
  },
  {
    accessorKey: 'blockCount',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Blocks" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.blockCount}</span>
    ),
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Updated" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.original.updatedAt).toLocaleDateString()}
      </span>
    ),
  },
];

async function fetchPages(params: DataGridQueryParams) {
  const res = await adminListPages({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as AdminListPagesQueryParamsSortByEnumKey | undefined,
    sortOrder: params.sortOrder,
    status: params.filters.status as AdminListPagesQueryParamsStatusEnumKey | undefined,
  });
  return { data: res.data, meta: res.meta };
}

export default function CmsPagesPage() {
  return (
    <AppDataGrid<PageItem>
      queryKey={cmsPagesQueryPrefix}
      columns={columns}
      fetcher={fetchPages}
      searchPlaceholder="Search pages by title or handle…"
      filters={[statusFilter]}
      initialSort={[{ id: 'updatedAt', desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/cms/pages/new">
            <IconPlus />
            <span className="hidden lg:inline">New page</span>
          </Link>
        </Button>
      }
    />
  );
}
