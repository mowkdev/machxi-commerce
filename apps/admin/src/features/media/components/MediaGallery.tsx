import { DataGridPagination } from "@/components/app-data-grid/data-grid-pagination"
import {
  MEDIA_GALLERY_PAGE_SIZE_OPTIONS,
  useMediaGallery,
} from "../hooks/useMediaGallery"
import { MediaDetailDrawer } from "./MediaDetailDrawer"
import { MediaGrid } from "./MediaGrid"
import { MediaList } from "./MediaList"
import { MediaToolbar } from "./MediaToolbar"
import { MediaUploadDropzone } from "./MediaUploadDropzone"

export function MediaGallery() {
  const gallery = useMediaGallery()

  return (
    <div className="flex w-full flex-col gap-4 py-4 md:py-6">
      <MediaToolbar
        search={gallery.searchInput}
        onSearchChange={gallery.setSearchInput}
        view={gallery.view}
        onViewChange={(v) => gallery.setUrlParams({ view: v === "grid" ? undefined : v })}
        mime={gallery.mime}
        onMimeChange={(v) => gallery.setUrlParams({ type: v }, true)}
        sort={gallery.sort}
        onSortChange={(v) =>
          gallery.setUrlParams({ sort: v === "createdAt-desc" ? undefined : v }, true)
        }
        selectedCount={gallery.selected.size}
        onClearSelection={gallery.clearSelection}
        onBulkDelete={gallery.handleBulkDelete}
      />

      <div className="px-4 lg:px-6">
        {gallery.query.isPending ? (
          <div className="rounded-md border p-12 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : gallery.query.isError ? (
          <div className="rounded-md border p-12 text-center text-sm text-destructive">
            {gallery.query.error.message ?? "Failed to load media"}
          </div>
        ) : gallery.items.length === 0 ? (
          <MediaUploadDropzone />
        ) : gallery.view === "grid" ? (
          <MediaGrid
            items={gallery.items}
            selected={gallery.selected}
            onToggleSelect={gallery.toggleSelect}
            onOpen={gallery.setOpenId}
          />
        ) : (
          <MediaList
            items={gallery.items}
            selected={gallery.selected}
            onToggleSelect={gallery.toggleSelect}
            onOpen={gallery.setOpenId}
            allSelected={gallery.allSelected}
            onSelectAll={gallery.handleSelectAll}
          />
        )}
      </div>

      <DataGridPagination
        meta={gallery.meta}
        page={gallery.page}
        pageSize={gallery.pageSize}
        pageSizeOptions={MEDIA_GALLERY_PAGE_SIZE_OPTIONS}
        onPageChange={(p) => gallery.setUrlParams({ page: String(p) })}
        onPageSizeChange={(s) => gallery.setUrlParams({ pageSize: String(s), page: "1" })}
        isFetching={gallery.query.isFetching && !gallery.query.isPending}
      />

      <MediaDetailDrawer id={gallery.openId} onClose={() => gallery.setOpenId(null)} />
    </div>
  )
}
