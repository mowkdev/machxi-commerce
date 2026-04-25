import { IconArrowDown, IconArrowUp, IconArrowsSort } from "@tabler/icons-react"
import type { Column } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DataGridColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataGridColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataGridColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn("text-sm font-medium", className)}>{title}</div>
  }

  const sorted = column.getIsSorted()

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-2 h-7 px-2 data-[state=open]:bg-accent", className)}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      <span>{title}</span>
      {sorted === "desc" ? (
        <IconArrowDown className="size-3.5" />
      ) : sorted === "asc" ? (
        <IconArrowUp className="size-3.5" />
      ) : (
        <IconArrowsSort className="size-3.5 opacity-50" />
      )}
    </Button>
  )
}
