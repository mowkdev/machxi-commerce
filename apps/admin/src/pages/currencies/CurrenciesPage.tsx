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
import { currenciesQueryPrefix } from "@/features/currencies/hooks";
import {
  adminListCurrencies,
  type AdminListCurrenciesQueryParamsSortByEnumKey,
} from "@repo/admin-sdk";
import type { CurrencyListItem } from "@repo/types/admin";

const columns: ColumnDef<CurrencyListItem>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Code" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/settings/regions/currencies/${row.original.code}`}
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
    accessorKey: "symbol",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Symbol" />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.symbol}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "decimalDigits",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Decimals" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.decimalDigits}
      </span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Active" />
    ),
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge>Yes</Badge>
      ) : (
        <span className="text-sm text-muted-foreground">No</span>
      ),
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
        <span className="text-sm text-muted-foreground">No</span>
      ),
  },
  {
    accessorKey: "displayOrder",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Order" />
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
];

async function fetchCurrencies(params: DataGridQueryParams) {
  const res = await adminListCurrencies({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as
      | AdminListCurrenciesQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
  });
  return { data: res.data, meta: res.meta };
}

export default function CurrenciesPage() {
  return (
    <AppDataGrid<CurrencyListItem>
      queryKey={currenciesQueryPrefix}
      columns={columns}
      fetcher={fetchCurrencies}
      searchPlaceholder="Search currencies..."
      initialSort={[{ id: "displayOrder", desc: false }]}
      getRowId={(row) => row.code}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/settings/regions/currencies/new">
            <IconPlus />
            <span className="hidden lg:inline">New currency</span>
          </Link>
        </Button>
      }
    />
  );
}
