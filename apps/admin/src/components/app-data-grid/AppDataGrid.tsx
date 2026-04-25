import * as React from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"

import { ApiRequestError } from "@/lib/api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DataGridPagination } from "./data-grid-pagination"
import { DataGridToolbar } from "./data-grid-toolbar"
import { useDebouncedValue } from "./use-debounced-value"
import type {
  AppDataGridProps,
  DataGridQueryParams,
  DataGridResponse,
} from "./types"

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100]

export function AppDataGrid<TData>({
  queryKey,
  columns,
  fetcher,
  searchPlaceholder,
  filters,
  toolbarActions,
  initialPageSize = 20,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  initialSort = [],
  getRowId,
  emptyState,
  enableColumnVisibility = true,
}: AppDataGridProps<TData>) {
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(initialPageSize)
  const [sorting, setSorting] = React.useState<SortingState>(initialSort)
  const [searchInput, setSearchInput] = React.useState("")
  const [filterValues, setFilterValues] = React.useState<
    Record<string, string | undefined>
  >({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    {}
  )

  const debouncedSearch = useDebouncedValue(searchInput, 300)

  // Reset to page 1 whenever the underlying query shape changes.
  React.useEffect(() => {
    setPage(1)
  }, [debouncedSearch, filterValues, pageSize, sorting])

  const params = React.useMemo<DataGridQueryParams>(() => {
    const sort = sorting[0]
    return {
      page,
      pageSize,
      search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
      sortBy: sort?.id,
      sortOrder: sort ? (sort.desc ? "desc" : "asc") : undefined,
      filters: filterValues,
    }
  }, [page, pageSize, debouncedSearch, sorting, filterValues])

  const query = useQuery<DataGridResponse<TData>, ApiRequestError>({
    queryKey: [...queryKey, params],
    queryFn: () => fetcher(params),
    placeholderData: keepPreviousData,
  })

  const table = useReactTable({
    data: query.data?.data ?? [],
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination: { pageIndex: page - 1, pageSize },
    },
    pageCount: query.data?.meta.totalPages ?? -1,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId
      ? (row) => getRowId(row)
      : undefined,
  })

  const handleFilterChange = React.useCallback(
    (id: string, value: string | undefined) => {
      setFilterValues((prev) => {
        if (value === undefined) {
          if (prev[id] === undefined) return prev
          const next = { ...prev }
          delete next[id]
          return next
        }
        if (prev[id] === value) return prev
        return { ...prev, [id]: value }
      })
    },
    []
  )

  const visibleColumnCount = table.getVisibleLeafColumns().length

  return (
    <div className="flex w-full flex-col gap-4 py-4 md:py-6">
      <DataGridToolbar
        table={table}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        toolbarActions={toolbarActions}
        enableColumnVisibility={enableColumnVisibility}
      />

      <div className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : query.isError ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="h-24 text-center text-destructive"
                  >
                    {query.error.message ?? "Failed to load data"}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyState ?? "No results."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <DataGridPagination
        meta={query.data?.meta}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isFetching={query.isFetching && !query.isPending}
      />
    </div>
  )
}
