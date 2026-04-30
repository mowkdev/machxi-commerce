import { IconPlus } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridQueryParams,
} from "@/components/app-data-grid";
import { Button } from "@/components/ui/button";
import {
  listShippingOptions,
  shippingOptionsQueryPrefix,
} from "@/features/shipping/hooks";
import type { ShippingOptionListItem } from "@repo/types/admin";

export default function ShippingOptionsPage() {
  return (
    <AppDataGrid<ShippingOptionListItem>
      queryKey={shippingOptionsQueryPrefix}
      columns={columns}
      fetcher={fetchShippingOptions}
      searchPlaceholder="Search shipping options..."
      initialSort={[{ id: "createdAt", desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/shipping-options/new">
            <IconPlus />
            <span className="hidden lg:inline">New shipping option</span>
          </Link>
        </Button>
      }
    />
  );
}

const columns: ColumnDef<ShippingOptionListItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/shipping-options/${row.original.id}`}
        className="font-medium text-foreground hover:underline"
      >
        {row.original.name}
      </Link>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "taxClassName",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Tax class" />
    ),
    cell: ({ row }) => row.original.taxClassName,
  },
  {
    accessorKey: "zoneNames",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Zones" />
    ),
    cell: ({ row }) =>
      row.original.zoneNames.length
        ? row.original.zoneNames.join(", ")
        : "None",
    enableSorting: false,
  },
  {
    accessorKey: "prices",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Prices" />
    ),
    cell: ({ row }) =>
      row.original.prices
        .map((price) => `${price.currencyCode} ${price.amount}`)
        .join(", "),
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
];

async function fetchShippingOptions(params: DataGridQueryParams) {
  return listShippingOptions({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
}
