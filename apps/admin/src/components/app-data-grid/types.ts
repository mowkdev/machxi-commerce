import type { ColumnDef } from "@tanstack/react-table"
import type { QueryKey } from "@tanstack/react-query"
import type { ReactNode } from "react"
import type { PaginationMeta } from "@repo/types"

export interface DataGridQueryParams {
  page: number
  pageSize: number
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  filters: Record<string, string | undefined>
}

export interface DataGridResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface DataGridFilterOption {
  label: string
  value: string
}

export interface DataGridFilterDef {
  id: string
  label: string
  options: DataGridFilterOption[]
}

export interface AppDataGridProps<TData> {
  queryKey: QueryKey
  columns: ColumnDef<TData, unknown>[]
  fetcher: (params: DataGridQueryParams) => Promise<DataGridResponse<TData>>

  searchPlaceholder?: string
  filters?: DataGridFilterDef[]
  toolbarActions?: ReactNode

  initialPageSize?: number
  pageSizeOptions?: number[]
  initialSort?: { id: string; desc: boolean }[]

  getRowId?: (row: TData) => string
  emptyState?: ReactNode
  enableColumnVisibility?: boolean
}
