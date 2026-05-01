import { IconPlus } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";

import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridQueryParams,
} from "@/components/app-data-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { languagesQueryPrefix } from "@/features/languages/hooks";
import {
  adminListLanguages,
  type AdminListLanguagesQueryParamsSortByEnumKey,
} from "@repo/admin-sdk";
import type { LanguageListItem } from "@repo/types/admin";

const columns: ColumnDef<LanguageListItem>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Code" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/settings/regions/languages/${row.original.code}`}
        className="font-medium text-foreground hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: "isDefault",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Default" />
    ),
    cell: ({ row }) =>
      row.original.isDefault ? (
        <Badge>Default</Badge>
      ) : (
        <span className="text-muted-foreground">No</span>
      ),
  },
  {
    accessorKey: "updatedAt",
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
    accessorKey: "createdAt",
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

async function fetchLanguages(params: DataGridQueryParams) {
  const res = await adminListLanguages({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as
      | AdminListLanguagesQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
  });
  return { data: res.data, meta: res.meta };
}

export default function LanguagesPage() {
  return (
    <AppDataGrid<LanguageListItem>
      queryKey={languagesQueryPrefix}
      columns={columns}
      fetcher={fetchLanguages}
      searchPlaceholder="Search languages..."
      initialSort={[{ id: "createdAt", desc: true }]}
      getRowId={(row) => row.code}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/settings/regions/languages/new">
            <IconPlus />
            <span className="hidden lg:inline">New language</span>
          </Link>
        </Button>
      }
    />
  );
}
