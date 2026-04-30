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
  listShippingZones,
  shippingZonesQueryPrefix,
} from "@/features/shipping/hooks";
import type { ShippingZoneListItem } from "@repo/types/admin";

export default function ShippingZonesPage() {
  return (
    <AppDataGrid<ShippingZoneListItem>
      queryKey={shippingZonesQueryPrefix}
      columns={columns}
      fetcher={fetchShippingZones}
      searchPlaceholder="Search shipping zones..."
      initialSort={[{ id: "createdAt", desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/shipping-zones/new">
            <IconPlus />
            <span className="hidden lg:inline">New shipping zone</span>
          </Link>
        </Button>
      }
    />
  );
}

const columns: ColumnDef<ShippingZoneListItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/shipping-zones/${row.original.id}`}
        className="font-medium text-foreground hover:underline"
      >
        {row.original.name}
      </Link>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "countryCodes",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Countries" />
    ),
    cell: ({ row }) =>
      row.original.countryCodes.length
        ? row.original.countryCodes.join(", ")
        : "None",
    enableSorting: false,
  },
  {
    accessorKey: "optionCount",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Options" />
    ),
    cell: ({ row }) => row.original.optionCount,
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

async function fetchShippingZones(params: DataGridQueryParams) {
  return listShippingZones({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
}
