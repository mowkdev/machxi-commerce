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
import { fulfillmentsQueryPrefix } from "@/features/fulfillments/hooks";
import {
  adminListFulfillments,
  type AdminListFulfillmentsQueryParamsSortByEnumKey,
  type AdminListFulfillmentsQueryParamsStatusEnumKey,
} from "@repo/admin-sdk";
import type { FulfillmentListItem } from "@repo/types/admin";

const statusFilter: DataGridFilterDef = {
  id: "status",
  label: "Status",
  options: [
    { value: "pending", label: "Pending" },
    { value: "partially_fulfilled", label: "Partially fulfilled" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "canceled", label: "Canceled" },
  ],
};

const columns: ColumnDef<FulfillmentListItem>[] = [
  {
    accessorKey: "orderDisplayId",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Fulfillment" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Link
          to={`/fulfillments/${row.original.id}`}
          className="font-medium text-foreground hover:underline"
        >
          {row.original.orderDisplayId ?? row.original.orderId}
        </Link>
        <span className="text-sm text-muted-foreground">
          {row.original.locationName ?? "Unknown location"}
        </span>
      </div>
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
    accessorKey: "trackingNum",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Tracking" />
    ),
    cell: ({ row }) => row.original.trackingNum ?? "-",
    enableSorting: false,
  },
  {
    accessorKey: "carrier",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Carrier" />
    ),
    cell: ({ row }) => row.original.carrier ?? "-",
    enableSorting: false,
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

async function fetchFulfillments(params: DataGridQueryParams) {
  const res = await adminListFulfillments({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as
      | AdminListFulfillmentsQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
    status: params.filters.status as
      | AdminListFulfillmentsQueryParamsStatusEnumKey
      | undefined,
  });
  return { data: res.data as FulfillmentListItem[], meta: res.meta };
}

export default function FulfillmentsPage() {
  return (
    <AppDataGrid<FulfillmentListItem>
      queryKey={fulfillmentsQueryPrefix}
      columns={columns}
      fetcher={fetchFulfillments}
      searchPlaceholder="Search fulfillments by order, tracking, carrier…"
      filters={[statusFilter]}
      initialSort={[{ id: "createdAt", desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/fulfillments/new">
            <IconPlus />
            <span className="hidden lg:inline">New fulfillment</span>
          </Link>
        </Button>
      }
    />
  );
}
