import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { useDebouncedValue } from "@/components/app-data-grid/use-debounced-value"
import { useBulkDeleteMedia, useMediaList } from "../hooks"
import {
  pickSortQuery,
  type MimeFilter,
  type SortKey,
  type ViewMode,
} from "../components/MediaToolbar"

export const MEDIA_GALLERY_PAGE_SIZE_OPTIONS = [12, 24, 48, 96]

export function useMediaGallery() {
  const [params, setParams] = useSearchParams()

  const view = (params.get("view") as ViewMode) || "grid"
  const page = Number(params.get("page") ?? 1)
  const pageSize = Number(params.get("pageSize") ?? 24)
  const search = params.get("q") ?? ""
  const mime = (params.get("type") as MimeFilter) || "all"
  const sort = (params.get("sort") as SortKey) || "createdAt-desc"

  const [searchInput, setSearchInput] = React.useState(search)
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  React.useEffect(() => {
    const next = new URLSearchParams(params)
    if (debouncedSearch) next.set("q", debouncedSearch)
    else next.delete("q")
    if (debouncedSearch !== search) {
      next.set("page", "1")
      setParams(next, { replace: true })
    }
  }, [debouncedSearch, params, search, setParams])

  const setUrlParams = React.useCallback(
    (patch: Record<string, string | undefined>, resetPage = false) => {
      const next = new URLSearchParams(params)
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "" || value === "all") next.delete(key)
        else next.set(key, value)
      }
      if (resetPage) next.set("page", "1")
      setParams(next, { replace: true })
    },
    [params, setParams]
  )

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
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const lastClickedRef = React.useRef<string | null>(null)
  const bulkDelete = useBulkDeleteMedia()

  React.useEffect(() => {
    setSelected(new Set())
  }, [debouncedSearch, mime, sort, page, pageSize])

  const toggleSelect = React.useCallback(
    (id: string, event: React.MouseEvent) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (event.shiftKey && lastClickedRef.current && lastClickedRef.current !== id) {
          const ids = items.map((item) => item.id)
          const start = ids.indexOf(lastClickedRef.current)
          const end = ids.indexOf(id)
          if (start >= 0 && end >= 0) {
            const [from, to] = start < end ? [start, end] : [end, start]
            for (let index = from; index <= to; index++) next.add(ids[index])
            lastClickedRef.current = id
            return next
          }
        }

        if (next.has(id)) next.delete(id)
        else next.add(id)
        lastClickedRef.current = id
        return next
      })
    },
    [items]
  )

  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id))

  const handleSelectAll = React.useCallback(
    (isSelected: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (isSelected) for (const item of items) next.add(item.id)
        else for (const item of items) next.delete(item.id)
        return next
      })
    },
    [items]
  )

  const clearSelection = React.useCallback(() => setSelected(new Set()), [])

  const handleBulkDelete = React.useCallback(() => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    bulkDelete.mutate(ids, { onSuccess: clearSelection })
  }, [bulkDelete, clearSelection, selected])

  const openId = params.get("open")
  const setOpenId = React.useCallback(
    (id: string | null) => setUrlParams({ open: id ?? undefined }),
    [setUrlParams]
  )

  return {
    allSelected,
    clearSelection,
    handleBulkDelete,
    handleSelectAll,
    items,
    meta,
    mime,
    openId,
    page,
    pageSize,
    query,
    searchInput,
    selected,
    setOpenId,
    setSearchInput,
    setUrlParams,
    sort,
    toggleSelect,
    view,
  }
}
