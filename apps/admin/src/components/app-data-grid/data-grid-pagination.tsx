import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react"
import type { PaginationMeta } from "@repo/types"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DataGridPaginationProps {
  meta: PaginationMeta | undefined
  page: number
  pageSize: number
  pageSizeOptions: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  isFetching?: boolean
}

export function DataGridPagination({
  meta,
  page,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  isFetching,
}: DataGridPaginationProps) {
  const totalPages = meta?.totalPages ?? 1
  const totalItems = meta?.totalItems ?? 0
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-4 lg:flex-row lg:px-6">
      <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
        {totalItems.toLocaleString()} item{totalItems === 1 ? "" : "s"}
        {isFetching ? " · Loading…" : ""}
      </div>
      <div className="flex w-full items-center gap-6 lg:w-fit lg:gap-8">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Rows per page
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Page {page} of {Math.max(totalPages, 1)}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden size-8 p-0 lg:flex"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={!canPrev}
          >
            <span className="sr-only">First page</span>
            <IconChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrev}
          >
            <span className="sr-only">Previous page</span>
            <IconChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
          >
            <span className="sr-only">Next page</span>
            <IconChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => onPageChange(totalPages)}
            disabled={!canNext}
          >
            <span className="sr-only">Last page</span>
            <IconChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
