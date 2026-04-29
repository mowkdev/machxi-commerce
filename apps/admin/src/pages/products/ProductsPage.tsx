import { IconPlus } from "@tabler/icons-react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"

import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridFilterDef,
  type DataGridQueryParams,
} from "@/components/app-data-grid"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { productsQueryPrefix } from "@/features/products/hooks"
import {
  adminListProducts,
  type AdminListProducts200,
  type AdminListProductsQueryParamsSortByEnumKey,
  type AdminListProductsQueryParamsStatusEnumKey,
} from "@repo/admin-sdk"

type ProductListItem = AdminListProducts200["data"][number]

const STATUS_VARIANTS: Record<
  ProductListItem["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  published: "default",
  draft: "secondary",
  archived: "outline",
  deleted: "destructive",
}

const statusFilter: DataGridFilterDef = {
  id: "status",
  label: "Status",
  options: [
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "archived", label: "Archived" },
  ],
}

const columns: ColumnDef<ProductListItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link to={`/products/${row.original.id}`} className="flex flex-col hover:underline">
        <span className="font-medium text-foreground">
          {row.original.name ?? "—"}
        </span>
        {row.original.handle && (
          <span className="text-xs text-muted-foreground">
            /{row.original.handle}
          </span>
        )}
      </Link>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "baseSku",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="SKU" />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.baseSku ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <Badge
        variant={STATUS_VARIANTS[row.original.status]}
        className="capitalize"
      >
        {row.original.status}
      </Badge>
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
]

async function fetchProducts(params: DataGridQueryParams) {
  const res = await adminListProducts({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as
      | AdminListProductsQueryParamsSortByEnumKey
      | undefined,
    sortOrder: params.sortOrder,
    status: params.filters.status as
      | AdminListProductsQueryParamsStatusEnumKey
      | undefined,
  })
  return { data: res.data, meta: res.meta }
}

export default function ProductsPage() {
  return (
    <AppDataGrid<ProductListItem>
      queryKey={productsQueryPrefix}
      columns={columns}
      fetcher={fetchProducts}
      searchPlaceholder="Search products by name or SKU…"
      filters={[statusFilter]}
      initialSort={[{ id: "createdAt", desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/products/new">
            <IconPlus />
            <span className="hidden lg:inline">New product</span>
          </Link>
        </Button>
      }
    />
  )
}
