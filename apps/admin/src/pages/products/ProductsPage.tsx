import { IconPlus } from "@tabler/icons-react"
import type { ColumnDef } from "@tanstack/react-table"

import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridFilterDef,
} from "@/components/app-data-grid"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  listProducts,
  productsKeys,
  type ProductListItem,
} from "@/features/products/api"

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
      <div className="flex flex-col">
        <span className="font-medium text-foreground">
          {row.original.name ?? "—"}
        </span>
        {row.original.handle && (
          <span className="text-xs text-muted-foreground">
            /{row.original.handle}
          </span>
        )}
      </div>
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

export default function ProductsPage() {
  return (
    <AppDataGrid<ProductListItem>
      queryKey={productsKeys.list()}
      columns={columns}
      fetcher={listProducts}
      searchPlaceholder="Search products by name or SKU…"
      filters={[statusFilter]}
      initialSort={[{ id: "createdAt", desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm">
          <IconPlus />
          <span className="hidden lg:inline">New product</span>
        </Button>
      }
    />
  )
}
