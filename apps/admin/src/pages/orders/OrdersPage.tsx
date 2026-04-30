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
import { ordersQueryPrefix } from "@/features/orders/hooks";
import {
  adminListOrders,
  type AdminListOrdersQueryParamsSortByEnumKey,
  type AdminListOrdersQueryParamsStatusEnumKey,
} from "@repo/admin-sdk";
import type { OrderListItem } from "@repo/types/admin";

const statusFilter: DataGridFilterDef = {
  id: "status",
  label: "Status",
  options: [
    { value: "pending", label: "Pending" },
    { value: "awaiting_payment", label: "Awaiting payment" },
    { value: "processing", label: "Processing" },
    { value: "completed", label: "Completed" },
    { value: "canceled", label: "Canceled" },
    { value: "refunded", label: "Refunded" },
    { value: "payment_failed", label: "Payment failed" },
    { value: "partially_refunded", label: "Partially refunded" },
  ],
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

const columns: ColumnDef<OrderListItem>[] = [
  {
    accessorKey: "displayId",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Order" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Link
          to={`/orders/${row.original.id}`}
          className="font-medium text-foreground hover:underline"
        >
          {row.original.displayId}
        </Link>
        <span className="text-sm text-muted-foreground">
          {row.original.customerName ?? row.original.customerEmail ?? "Guest"}
        </span>
      </div>
    ),
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
    accessorKey: "fulfillmentCount",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Fulfillments" />
    ),
    cell: ({ row }) => row.original.fulfillmentCount,
    enableSorting: false,
  },
  {
    accessorKey: "returnCount",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Returns" />
    ),
    cell: ({ row }) => row.original.returnCount,
    enableSorting: false,
  },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) =>
      formatMoney(row.original.totalAmount, row.original.currencyCode),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
];

async function fetchOrders(params: DataGridQueryParams) {
  const res = await adminListOrders({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as AdminListOrdersQueryParamsSortByEnumKey | undefined,
    sortOrder: params.sortOrder,
    status: params.filters.status as
      | AdminListOrdersQueryParamsStatusEnumKey
      | undefined,
  });
  return { data: res.data as OrderListItem[], meta: res.meta };
}

export default function OrdersPage() {
  return (
    <AppDataGrid<OrderListItem>
      queryKey={ordersQueryPrefix}
      columns={columns}
      fetcher={fetchOrders}
      searchPlaceholder="Search orders by display id or customer…"
      filters={[statusFilter]}
      initialSort={[{ id: "createdAt", desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/orders/new">
            <IconPlus />
            <span className="hidden lg:inline">New order</span>
          </Link>
        </Button>
      }
    />
  );
}
