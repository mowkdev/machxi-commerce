import { IconPlus } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";

import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridQueryParams,
} from "@/components/app-data-grid";
import { Button } from "@/components/ui/button";
import { customersQueryPrefix } from "@/features/customers/hooks";
import {
  adminListCustomers,
  type AdminListCustomersQueryParamsSortByEnumKey,
} from "@repo/admin-sdk";
import type { CustomerListItem } from "@repo/types/admin";

const columns: ColumnDef<CustomerListItem>[] = [
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Customer" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Link
          to={`/customers/${row.original.id}`}
          className="font-medium text-foreground hover:underline"
        >
          {row.original.firstName} {row.original.lastName}
        </Link>
        <span className="text-sm text-muted-foreground">
          {row.original.email}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Phone" />
    ),
    cell: ({ row }) => row.original.phone ?? "-",
    enableSorting: false,
  },
  {
    accessorKey: "addressCount",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Addresses" />
    ),
    cell: ({ row }) => row.original.addressCount,
    enableSorting: false,
  },
  {
    accessorKey: "orderCount",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Orders" />
    ),
    cell: ({ row }) => row.original.orderCount,
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

async function fetchCustomers(params: DataGridQueryParams) {
  const res = await adminListCustomers({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as
      | AdminListCustomersQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
  });
  return { data: res.data, meta: res.meta };
}

export default function CustomersPage() {
  return (
    <AppDataGrid<CustomerListItem>
      queryKey={customersQueryPrefix}
      columns={columns}
      fetcher={fetchCustomers}
      searchPlaceholder="Search customers…"
      initialSort={[{ id: "createdAt", desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/customers/new">
            <IconPlus />
            <span className="hidden lg:inline">New customer</span>
          </Link>
        </Button>
      }
    />
  );
}
