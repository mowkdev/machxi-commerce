import type { MediaListItem } from "@repo/types/admin"
import { MediaCard } from "./MediaCard"

interface MediaGridProps {
  items: MediaListItem[]
  selected?: Set<string>
  onToggleSelect?: (id: string, e: React.MouseEvent) => void
  onOpen?: (id: string) => void
  selectable?: boolean
  className?: string
}

export function MediaGrid({
  items,
  selected = new Set(),
  onToggleSelect,
  onOpen,
  selectable = true,
  className,
}: MediaGridProps) {
  return (
    <div className={className ?? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"}>
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          selected={selected.has(item.id)}
          onToggleSelect={onToggleSelect}
          onOpen={onOpen}
          selectable={selectable}
        />
      ))}
    </div>
  )
}
