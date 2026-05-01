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
import { usersQueryPrefix } from "@/features/users/hooks";
import {
  adminListUsers,
  type AdminListUsersQueryParamsSortByEnumKey,
} from "@repo/admin-sdk";
import type { UserListItem } from "@repo/types/admin";

const columns: ColumnDef<UserListItem>[] = [
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="User" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Link
          to={`/settings/team/users/${row.original.id}`}
          className="font-medium text-foreground hover:underline"
        >
          {row.original.name?.trim() || row.original.email}
        </Link>
        {row.original.name?.trim() ? (
          <span className="text-sm text-muted-foreground">
            {row.original.email}
          </span>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "roles",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Roles" />
    ),
    cell: ({ row }) => {
      const roles = row.original.roles;
      if (roles.length === 0)
        return <span className="text-sm text-muted-foreground">None</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {roles.map((role) => (
            <Badge key={role.id} variant="secondary">
              {role.name}
            </Badge>
          ))}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge>Active</Badge>
      ) : (
        <Badge variant="outline">Inactive</Badge>
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

async function fetchUsers(params: DataGridQueryParams) {
  const res = await adminListUsers({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as
      | AdminListUsersQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
  });
  return { data: res.data, meta: res.meta };
}

export default function UsersPage() {
  return (
    <AppDataGrid<UserListItem>
      queryKey={usersQueryPrefix}
      columns={columns}
      fetcher={fetchUsers}
      searchPlaceholder="Search users..."
      initialSort={[{ id: "createdAt", desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/settings/team/users/new">
            <IconPlus />
            <span className="hidden lg:inline">New user</span>
          </Link>
        </Button>
      }
    />
  );
}
