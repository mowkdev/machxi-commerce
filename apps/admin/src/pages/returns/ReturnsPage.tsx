import { IconPlus } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridFilterDef,
  type DataGridQueryParams,
} from "@/components/app-data-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { returnsQueryPrefix } from "@/features/returns/hooks";
import {
  adminListReturns,
  type AdminListReturnsQueryParamsSortByEnumKey,
  type AdminListReturnsQueryParamsStatusEnumKey,
} from "@repo/admin-sdk";
import type { ReturnListItem } from "@repo/types/admin";

const statusFilter: DataGridFilterDef = {
  id: "status",
  label: "Status",
  options: [
    { value: "requested", label: "Requested" },
    { value: "received", label: "Received" },
    { value: "refunded", label: "Refunded" },
    { value: "rejected", label: "Rejected" },
  ],
};

const columns: ColumnDef<ReturnListItem>[] = [
  {
    accessorKey: "orderDisplayId",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Return" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/returns/${row.original.id}`}
        className="font-medium text-foreground hover:underline"
      >
        {row.original.orderDisplayId ?? row.original.orderId}
      </Link>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <Badge variant="secondary" className="capitalize">
        {row.original.status.replaceAll("_", " ")}
      </Badge>
    ),
  },
  {
    accessorKey: "itemCount",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Items" />
    ),
    cell: ({ row }) => row.original.itemCount,
    enableSorting: false,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
];

async function fetchReturns(params: DataGridQueryParams) {
  const res = await adminListReturns({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as
      | AdminListReturnsQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
    status: params.filters.status as
      | AdminListReturnsQueryParamsStatusEnumKey
      | undefined,
  });
  return { data: res.data as ReturnListItem[], meta: res.meta };
}

export default function ReturnsPage() {
  return (
    <AppDataGrid<ReturnListItem>
      queryKey={returnsQueryPrefix}
      columns={columns}
      fetcher={fetchReturns}
      searchPlaceholder="Search returns by order display id…"
      filters={[statusFilter]}
      initialSort={[{ id: "createdAt", desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/returns/new">
            <IconPlus />
            <span className="hidden lg:inline">New return</span>
          </Link>
        </Button>
      }
    />
  );
}
