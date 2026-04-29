import { IconPhoto } from "@tabler/icons-react"
import type { MediaListItem } from "@repo/types/admin"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { shortMime } from "../utils"

interface MediaCardProps {
  item: MediaListItem
  selected?: boolean
  onToggleSelect?: (id: string, e: React.MouseEvent) => void
  onOpen?: (id: string) => void
  selectable?: boolean
}

export function MediaCard({
  item,
  selected = false,
  onToggleSelect,
  onOpen,
  selectable = true,
}: MediaCardProps) {
  const preview = item.thumbnailUrl ?? item.url
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(item.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpen?.(item.id)
        }
      }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-md border bg-card text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {preview ? (
          <img
            src={preview}
            alt={item.altText ?? item.fileName}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <IconPhoto className="size-10" />
          </div>
        )}
        {selectable && onToggleSelect ? (
          <span
            className="absolute left-2 top-2"
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect(item.id, e)
            }}
          >
            <Checkbox
              checked={selected}
              onCheckedChange={() => {
                /* handled via the wrapping span's click */
              }}
              className="bg-background/90"
              aria-label={`Select ${item.fileName}`}
            />
          </span>
        ) : null}
        <span className="absolute right-2 top-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/80">
          {shortMime(item.mimeType)}
        </span>
      </div>
      <div className="p-2">
        <div className="truncate text-xs font-medium" title={item.fileName}>
          {item.title || item.fileName}
        </div>
        {!item.altText && (
          <div className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">
            No alt text
          </div>
        )}
      </div>
    </div>
  )
}
