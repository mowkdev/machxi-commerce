import type { MediaListItem } from "@repo/types/admin"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatBytes, formatDimensions, shortMime } from "../utils"

interface MediaListProps {
  items: MediaListItem[]
  selected: Set<string>
  onToggleSelect: (id: string, e: React.MouseEvent) => void
  onOpen: (id: string) => void
  allSelected: boolean
  onSelectAll: (next: boolean) => void
}

export function MediaList({
  items,
  selected,
  onToggleSelect,
  onOpen,
  allSelected,
  onSelectAll,
}: MediaListProps) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => onSelectAll(Boolean(v))}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="w-16">Preview</TableHead>
            <TableHead>Filename</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Dimensions</TableHead>
            <TableHead>Alt text</TableHead>
            <TableHead>Uploaded</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer"
              data-state={selected.has(item.id) ? "selected" : undefined}
              onClick={() => onOpen(item.id)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <span onClick={(e) => onToggleSelect(item.id, e)}>
                  <Checkbox
                    checked={selected.has(item.id)}
                    onCheckedChange={() => {
                      /* handled by wrapping onClick */
                    }}
                    aria-label={`Select ${item.fileName}`}
                  />
                </span>
              </TableCell>
              <TableCell>
                {item.thumbnailUrl || item.url ? (
                  <img
                    src={item.thumbnailUrl ?? item.url}
                    alt={item.altText ?? item.fileName}
                    loading="lazy"
                    className="size-10 rounded object-cover"
                  />
                ) : null}
              </TableCell>
              <TableCell className="font-medium">
                <div className="max-w-xs truncate">
                  {item.title || item.fileName}
                </div>
                {item.title && (
                  <div className="max-w-xs truncate text-xs text-muted-foreground">
                    {item.fileName}
                  </div>
                )}
              </TableCell>
              <TableCell>{shortMime(item.mimeType)}</TableCell>
              <TableCell>{formatBytes(item.sizeBytes)}</TableCell>
              <TableCell>{formatDimensions(item.width, item.height) ?? "—"}</TableCell>
              <TableCell>
                {item.altText ? (
                  <span className="line-clamp-1 max-w-xs text-xs">{item.altText}</span>
                ) : (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    Missing
                  </span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
