import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridFilterDef,
  type DataGridQueryParams,
} from "@/components/app-data-grid";
import { Badge } from "@/components/ui/badge";
import { cartsQueryPrefix } from "@/features/carts/hooks";
import {
  adminListCarts,
  type AdminListCartsQueryParamsSortByEnumKey,
  type AdminListCartsQueryParamsStatusEnumKey,
  type AdminListCartsQueryParamsCustomerTypeEnumKey,
} from "@repo/admin-sdk";
import type { AdminCartListItem } from "@repo/types/admin";

const statusFilter: DataGridFilterDef = {
  id: "status",
  label: "Status",
  options: [
    { value: "active", label: "Active" },
    { value: "expired", label: "Expired" },
  ],
};

const customerTypeFilter: DataGridFilterDef = {
  id: "customerType",
  label: "Customer type",
  options: [
    { value: "guest", label: "Guest" },
    { value: "registered", label: "Registered" },
  ],
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

const columns: ColumnDef<AdminCartListItem>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Cart" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Link
          to={`/carts/${row.original.id}`}
          className="font-medium text-foreground hover:underline"
        >
          {row.original.id.slice(0, 8)}…
        </Link>
        <span className="text-sm text-muted-foreground">
          {row.original.customerName ?? row.original.customerEmail ?? "Guest"}
        </span>
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "isExpired",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <Badge variant={row.original.isExpired ? "outline" : "secondary"}>
        {row.original.isExpired ? "Expired" : "Active"}
      </Badge>
    ),
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
    accessorKey: "total",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) =>
      row.original.total > 0
        ? formatMoney(row.original.total, row.original.currencyCode)
        : "-",
    enableSorting: false,
  },
  {
    accessorKey: "expiresAt",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Expires" />
    ),
    cell: ({ row }) => new Date(row.original.expiresAt).toLocaleDateString(),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
];

async function fetchCarts(params: DataGridQueryParams) {
  const res = await adminListCarts({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as AdminListCartsQueryParamsSortByEnumKey | undefined,
    sortOrder: params.sortOrder,
    status: params.filters.status as
      | AdminListCartsQueryParamsStatusEnumKey
      | undefined,
    customerType: params.filters.customerType as
      | AdminListCartsQueryParamsCustomerTypeEnumKey
      | undefined,
  });
  return { data: res.data as AdminCartListItem[], meta: res.meta };
}

export default function CartsPage() {
  return (
    <AppDataGrid<AdminCartListItem>
      queryKey={cartsQueryPrefix}
      columns={columns}
      fetcher={fetchCarts}
      searchPlaceholder="Search carts by id or customer…"
      filters={[statusFilter, customerTypeFilter]}
      initialSort={[{ id: "createdAt", desc: true }]}
      getRowId={(row) => row.id}
    />
  );
}
