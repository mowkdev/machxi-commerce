import { IconPlus } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";

import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridQueryParams,
} from "@/components/app-data-grid";
import { Button } from "@/components/ui/button";
import { rolesQueryPrefix } from "@/features/roles/hooks";
import {
  adminListRoles,
  type AdminListRolesQueryParamsSortByEnumKey,
} from "@repo/admin-sdk";
import type { RoleListItem } from "@repo/types/admin";

const columns: ColumnDef<RoleListItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/settings/team/roles/${row.original.id}`}
        className="font-medium text-foreground hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) =>
      row.original.description ? (
        <span className="text-sm">{row.original.description}</span>
      ) : (
        <span className="text-sm text-muted-foreground">-</span>
      ),
    enableSorting: false,
  },
  {
    accessorKey: "userCount",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Users" />
    ),
    cell: ({ row }) => row.original.userCount,
    enableSorting: false,
  },
  {
    accessorKey: "permissionCount",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Permissions" />
    ),
    cell: ({ row }) => row.original.permissionCount,
    enableSorting: false,
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

async function fetchRoles(params: DataGridQueryParams) {
  const res = await adminListRoles({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as
      | AdminListRolesQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
  });
  return { data: res.data, meta: res.meta };
}

export default function RolesPage() {
  return (
    <AppDataGrid<RoleListItem>
      queryKey={rolesQueryPrefix}
      columns={columns}
      fetcher={fetchRoles}
      searchPlaceholder="Search roles..."
      initialSort={[{ id: "createdAt", desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/settings/team/roles/new">
            <IconPlus />
            <span className="hidden lg:inline">New role</span>
          </Link>
        </Button>
      }
    />
  );
}
