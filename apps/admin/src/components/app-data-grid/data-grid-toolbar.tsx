import * as React from "react"
import { IconChevronDown, IconLayoutColumns, IconSearch, IconX } from "@tabler/icons-react"
import type { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { DataGridFilterDef } from "./types"

interface DataGridToolbarProps<TData> {
  table: Table<TData>
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: DataGridFilterDef[]
  filterValues: Record<string, string | undefined>
  onFilterChange: (id: string, value: string | undefined) => void
  toolbarActions?: React.ReactNode
  enableColumnVisibility?: boolean
}

const ALL_VALUE = "__all__"

export function DataGridToolbar<TData>({
  table,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  filterValues,
  onFilterChange,
  toolbarActions,
  enableColumnVisibility = true,
}: DataGridToolbarProps<TData>) {
  const hasActiveFilters =
    Boolean(searchValue) ||
    Object.values(filterValues).some((v) => v !== undefined && v !== "")

  return (
    <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8"
          />
        </div>

        {filters?.map((filter) => {
          const current = filterValues[filter.id] ?? ALL_VALUE
          return (
            <Select
              key={filter.id}
              value={current}
              onValueChange={(v) =>
                onFilterChange(filter.id, v === ALL_VALUE ? undefined : v)
              }
            >
              <SelectTrigger size="sm" className="h-8 w-auto min-w-32">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All {filter.label}</SelectItem>
                {filter.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        })}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => {
              onSearchChange("")
              filters?.forEach((f) => onFilterChange(f.id, undefined))
            }}
          >
            Reset
            <IconX className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {enableColumnVisibility && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">Columns</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {toolbarActions}
      </div>
    </div>
  )
}
