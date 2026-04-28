import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { DataGridPagination } from "@/components/app-data-grid/data-grid-pagination"
import { useDebouncedValue } from "@/components/app-data-grid/use-debounced-value"
import { useBulkDeleteMedia, useMediaList } from "../hooks"
import { MediaDetailDrawer } from "./MediaDetailDrawer"
import { MediaGrid } from "./MediaGrid"
import { MediaList } from "./MediaList"
import {
  MediaToolbar,
  pickSortQuery,
  type MimeFilter,
  type SortKey,
  type ViewMode,
} from "./MediaToolbar"
import { MediaUploadDropzone } from "./MediaUploadDropzone"

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96]

export function MediaGallery() {
  const [params, setParams] = useSearchParams()

  const view = (params.get("view") as ViewMode) || "grid"
  const page = Number(params.get("page") ?? 1)
  const pageSize = Number(params.get("pageSize") ?? 24)
  const search = params.get("q") ?? ""
  const mime = (params.get("type") as MimeFilter) || "all"
  const sort = (params.get("sort") as SortKey) || "createdAt-desc"

  const [searchInput, setSearchInput] = React.useState(search)
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  // Push debounced search to URL.
  React.useEffect(() => {
    const next = new URLSearchParams(params)
    if (debouncedSearch) next.set("q", debouncedSearch)
    else next.delete("q")
    if (debouncedSearch !== search) {
      next.set("page", "1")
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const set = (patch: Record<string, string | undefined>, resetPage = false) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "" || v === "all") next.delete(k)
      else next.set(k, v)
    }
    if (resetPage) next.set("page", "1")
    setParams(next, { replace: true })
  }

  const { sortBy, sortOrder } = pickSortQuery(sort)
  const query = useMediaList({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    mimeType: mime === "all" ? undefined : mime,
    sortBy,
    sortOrder,
  })

  const items = query.data?.data ?? []
  const meta = query.data?.meta

  // Selection state
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const lastClickedRef = React.useRef<string | null>(null)
  const bulkDelete = useBulkDeleteMedia()

  // Reset selection when underlying list changes meaningfully
  React.useEffect(() => {
    setSelected(new Set())
  }, [debouncedSearch, mime, sort, page, pageSize])

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    setSelected((prev) => {
      const next = new Set(prev)
      // Shift-click range select within current page
      if (e.shiftKey && lastClickedRef.current && lastClickedRef.current !== id) {
        const ids = items.map((m) => m.id)
        const a = ids.indexOf(lastClickedRef.current)
        const b = ids.indexOf(id)
        if (a >= 0 && b >= 0) {
          const [from, to] = a < b ? [a, b] : [b, a]
          for (let i = from; i <= to; i++) next.add(ids[i])
          lastClickedRef.current = id
          return next
        }
      }
      if (next.has(id)) next.delete(id)
      else next.add(id)
      lastClickedRef.current = id
      return next
    })
  }

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id))
  const handleSelectAll = (next: boolean) => {
    setSelected((prev) => {
      const out = new Set(prev)
      if (next) for (const i of items) out.add(i.id)
      else for (const i of items) out.delete(i.id)
      return out
    })
  }

  const handleBulkDelete = () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    bulkDelete.mutate(ids, { onSuccess: () => setSelected(new Set()) })
  }

  // Detail drawer state — hash-style param so back/forward works.
  const openId = params.get("open")
  const setOpenId = (id: string | null) => set({ open: id ?? undefined })

  return (
    <div className="flex w-full flex-col gap-4 py-4 md:py-6">
      <MediaToolbar
        search={searchInput}
        onSearchChange={setSearchInput}
        view={view}
        onViewChange={(v) => set({ view: v === "grid" ? undefined : v })}
        mime={mime}
        onMimeChange={(v) => set({ type: v }, true)}
        sort={sort}
        onSortChange={(v) => set({ sort: v === "createdAt-desc" ? undefined : v }, true)}
        selectedCount={selected.size}
        onClearSelection={() => setSelected(new Set())}
        onBulkDelete={handleBulkDelete}
      />

      <div className="px-4 lg:px-6">
        {query.isPending ? (
          <div className="rounded-md border p-12 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : query.isError ? (
          <div className="rounded-md border p-12 text-center text-sm text-destructive">
            {query.error.message ?? "Failed to load media"}
          </div>
        ) : items.length === 0 ? (
          <MediaUploadDropzone />
        ) : view === "grid" ? (
          <MediaGrid
            items={items}
            selected={selected}
            onToggleSelect={toggleSelect}
            onOpen={(id) => setOpenId(id)}
          />
        ) : (
          <MediaList
            items={items}
            selected={selected}
            onToggleSelect={toggleSelect}
            onOpen={(id) => setOpenId(id)}
            allSelected={allSelected}
            onSelectAll={handleSelectAll}
          />
        )}
      </div>

      <DataGridPagination
        meta={meta}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageChange={(p) => set({ page: String(p) })}
        onPageSizeChange={(s) => set({ pageSize: String(s), page: "1" })}
        isFetching={query.isFetching && !query.isPending}
      />

      <MediaDetailDrawer id={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
