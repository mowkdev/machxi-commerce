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
import { paymentProvidersListQueryPrefix } from "@/features/payment-providers/hooks";
import {
  adminListPaymentProviders,
  type AdminListPaymentProvidersQueryParamsSortByEnumKey,
} from "@repo/admin-sdk";
import type { PaymentProviderListItem } from "@repo/types/admin";

const columns: ColumnDef<PaymentProviderListItem>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Code" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/settings/payments/providers/${row.original.id}`}
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
    accessorKey: "kind",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Kind" />
    ),
    cell: ({ row }) => (
      <span className="text-sm capitalize">{row.original.kind}</span>
    ),
  },
  {
    accessorKey: "isEnabled",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Enabled" />
    ),
    cell: ({ row }) =>
      row.original.isEnabled ? (
        <Badge>Yes</Badge>
      ) : (
        <span className="text-muted-foreground text-sm">No</span>
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

async function fetchPaymentProviders(params: DataGridQueryParams) {
  const res = await adminListPaymentProviders({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as
      | AdminListPaymentProvidersQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
  });
  return { data: res.data, meta: res.meta };
}

export default function PaymentProvidersPage() {
  return (
    <AppDataGrid<PaymentProviderListItem>
      queryKey={paymentProvidersListQueryPrefix}
      columns={columns}
      fetcher={fetchPaymentProviders}
      searchPlaceholder="Search payment providers..."
      initialSort={[{ id: "displayOrder", desc: false }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/settings/payments/providers/new">
            <IconPlus />
            <span className="hidden lg:inline">New provider</span>
          </Link>
        </Button>
      }
    />
  );
}
