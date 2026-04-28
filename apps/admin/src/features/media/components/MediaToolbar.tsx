import * as React from "react"
import {
  IconLayoutGrid,
  IconList,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MediaUploadDropzone } from "./MediaUploadDropzone"

export type ViewMode = "grid" | "list"
export type MimeFilter = "all" | "image/jpeg" | "image/png" | "image/webp" | "image/svg+xml"
export type SortKey = "createdAt-desc" | "createdAt-asc" | "fileName-asc" | "sizeBytes-desc"

interface MediaToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  view: ViewMode
  onViewChange: (v: ViewMode) => void
  mime: MimeFilter
  onMimeChange: (v: MimeFilter) => void
  sort: SortKey
  onSortChange: (v: SortKey) => void
  selectedCount: number
  onClearSelection: () => void
  onBulkDelete: () => void
}

export function MediaToolbar(props: MediaToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 lg:px-6">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by filename, title, alt…"
          value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          className="w-64 pl-8"
        />
      </div>

      <Select
        value={props.mime}
        onValueChange={(v) => props.onMimeChange(v as MimeFilter)}
      >
        <SelectTrigger className="w-40" aria-label="File type">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="image/jpeg">JPEG</SelectItem>
          <SelectItem value="image/png">PNG</SelectItem>
          <SelectItem value="image/webp">WebP</SelectItem>
          <SelectItem value="image/svg+xml">SVG</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={props.sort}
        onValueChange={(v) => props.onSortChange(v as SortKey)}
      >
        <SelectTrigger className="w-44" aria-label="Sort">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt-desc">Newest first</SelectItem>
          <SelectItem value="createdAt-asc">Oldest first</SelectItem>
          <SelectItem value="fileName-asc">Name A–Z</SelectItem>
          <SelectItem value="sizeBytes-desc">Largest first</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex-1" />

      {props.selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1">
          <span className="text-sm">{props.selectedCount} selected</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={props.onClearSelection}
            aria-label="Clear selection"
          >
            <IconX className="size-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <IconTrash className="size-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {props.selectedCount} item
                  {props.selectedCount === 1 ? "" : "s"}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Items used by products will leave broken references. This is
                  a soft delete; the records remain in the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={props.onBulkDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <ToggleGroup
        type="single"
        value={props.view}
        onValueChange={(v) => v && props.onViewChange(v as ViewMode)}
        size="sm"
        variant="outline"
      >
        <ToggleGroupItem value="grid" aria-label="Grid view">
          <IconLayoutGrid className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label="List view">
          <IconList className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <MediaUploadDropzone variant="button" />
    </div>
  )
}

export function pickSortQuery(sort: SortKey): {
  sortBy: "createdAt" | "fileName" | "sizeBytes"
  sortOrder: "asc" | "desc"
} {
  switch (sort) {
    case "createdAt-asc":
      return { sortBy: "createdAt", sortOrder: "asc" }
    case "fileName-asc":
      return { sortBy: "fileName", sortOrder: "asc" }
    case "sizeBytes-desc":
      return { sortBy: "sizeBytes", sortOrder: "desc" }
    case "createdAt-desc":
    default:
      return { sortBy: "createdAt", sortOrder: "desc" }
  }
}
