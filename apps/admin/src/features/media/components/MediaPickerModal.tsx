import * as React from 'react';
import {
  IconLayoutGrid,
  IconList,
  IconSearch,
  IconUpload,
} from '@tabler/icons-react';
import { AppModal } from '@/components/app-modal';
import { DataGridPagination } from '@/components/app-data-grid/data-grid-pagination';
import { useDebouncedValue } from '@/components/app-data-grid/use-debounced-value';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { MediaListItem } from '@repo/types/admin';
import { useMediaList, useUploadMedia } from '../hooks';
import { MediaGrid } from './MediaGrid';
import { MediaList } from './MediaList';

const PAGE_SIZE_OPTIONS = [12, 24, 48];
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml';

type ViewMode = 'grid' | 'list';

interface MediaPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialItems: MediaListItem[];
  onSave: (ids: string[]) => Promise<void>;
  isSaving: boolean;
}

export function MediaPickerModal({
  open,
  onOpenChange,
  initialItems,
  onSave,
  isSaving,
}: MediaPickerModalProps) {
  const initialIds = React.useMemo(() => initialItems.map((item) => item.id), [initialItems]);
  const [tab, setTab] = React.useState('gallery');
  const [view, setView] = React.useState<ViewMode>('grid');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(12);
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [selectionOrder, setSelectionOrder] = React.useState<string[]>(initialIds);
  const [files, setFiles] = React.useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = React.useState<Set<number>>(new Set());
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadMedia();

  React.useEffect(() => {
    if (!open) return;
    setTab('gallery');
    setView('grid');
    setPage(1);
    setSearch('');
    setSelectionOrder(initialIds);
    setFiles([]);
    setSelectedFiles(new Set());
  }, [initialIds, open]);

  const query = useMediaList({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    mimeType: 'image/',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const galleryItems = React.useMemo(() => {
    const attached = initialItems.filter((item) => selectionOrder.includes(item.id));
    const attachedIds = new Set(attached.map((item) => item.id));
    const pageItems = (query.data?.data ?? []).filter((item) => !attachedIds.has(item.id));
    return [...attached, ...pageItems];
  }, [initialItems, query.data?.data, selectionOrder]);

  const selected = React.useMemo(() => new Set(selectionOrder), [selectionOrder]);
  const hasChanged = !sameOrder(selectionOrder, initialIds);
  const selectedUploadCount = selectedFiles.size;
  const canSubmitGallery =
    initialIds.length === 0 ? selectionOrder.length > 0 : hasChanged;
  const canSubmitUpload = selectedUploadCount > 0;

  const toggleMedia = (id: string) => {
    setSelectionOrder((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const allSelected =
    galleryItems.length > 0 && galleryItems.every((item) => selected.has(item.id));
  const selectAll = (next: boolean) => {
    setSelectionOrder((prev) => {
      if (!next) {
        const visible = new Set(galleryItems.map((item) => item.id));
        return prev.filter((id) => !visible.has(id));
      }
      const out = [...prev];
      for (const item of galleryItems) {
        if (!out.includes(item.id)) out.push(item.id);
      }
      return out;
    });
  };

  const addFiles = (incoming: FileList | File[]) => {
    const nextFiles = Array.from(incoming).filter((file) =>
      ACCEPT.split(',').includes(file.type)
    );
    if (nextFiles.length === 0) return;
    setFiles((prev) => {
      const start = prev.length;
      setSelectedFiles((selected) => {
        const out = new Set(selected);
        nextFiles.forEach((_, index) => out.add(start + index));
        return out;
      });
      return [...prev, ...nextFiles];
    });
  };

  const handleUploadSelected = async () => {
    const chosen = files.filter((_, index) => selectedFiles.has(index));
    if (chosen.length === 0) return;
    const result = await uploadMutation.mutateAsync(chosen);
    const uploadedIds = result.uploaded.map((item) => item.id);
    if (uploadedIds.length === 0) return;
    const nextIds = [...selectionOrder];
    for (const id of uploadedIds) {
      if (!nextIds.includes(id)) nextIds.push(id);
    }
    await onSave(nextIds);
  };

  const actions =
    tab === 'gallery' ? (
      <>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!canSubmitGallery || isSaving}
          onClick={() => onSave(selectionOrder)}
        >
          {initialIds.length > 0 ? 'Update Selected' : 'Add selected'}
        </Button>
      </>
    ) : (
      <>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!canSubmitUpload || uploadMutation.isPending || isSaving}
          onClick={handleUploadSelected}
        >
          {uploadMutation.isPending || isSaving
            ? 'Uploading...'
            : `Upload Selected${selectedUploadCount ? ` (${selectedUploadCount})` : ''}`}
        </Button>
      </>
    );

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={initialIds.length > 0 ? 'Update images' : 'Add images'}
      description="Choose existing media or upload new images."
      actions={actions}
      contentClassName="min-h-[520px]"
    >
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList>
          <TabsTrigger value="gallery">Choose from media</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>
        <TabsContent value="gallery">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search media"
                  className="w-64 pl-8"
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {selectionOrder.length} selected
              </span>
              <div className="flex-1" />
              <ToggleGroup
                type="single"
                value={view}
                onValueChange={(value) => value && setView(value as ViewMode)}
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
            </div>

            <div className="max-h-[360px] overflow-auto rounded-md border p-3">
              {query.isPending ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  Loading media...
                </div>
              ) : query.isError ? (
                <div className="p-12 text-center text-sm text-destructive">
                  {query.error.message ?? 'Failed to load media'}
                </div>
              ) : galleryItems.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  No media found.
                </div>
              ) : view === 'grid' ? (
                <MediaGrid
                  items={galleryItems}
                  selected={selected}
                  onToggleSelect={toggleMedia}
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                />
              ) : (
                <MediaList
                  items={galleryItems}
                  selected={selected}
                  onToggleSelect={toggleMedia}
                  allSelected={allSelected}
                  onSelectAll={selectAll}
                />
              )}
            </div>

            <DataGridPagination
              meta={query.data?.meta}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              isFetching={query.isFetching && !query.isPending}
            />
          </div>
        </TabsContent>
        <TabsContent value="upload">
          <div className="flex flex-col gap-4">
            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                addFiles(event.dataTransfer.files);
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-8 text-center transition',
                dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
              )}
            >
              <IconUpload className="size-8 text-muted-foreground" />
              <div className="text-sm">
                <span className="font-medium">Drop files here</span>
                <span className="text-muted-foreground"> or </span>
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => inputRef.current?.click()}
                >
                  browse files
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, AVIF, GIF, SVG up to the configured upload limit.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) addFiles(event.target.files);
                  event.target.value = '';
                }}
              />
            </div>

            {files.length > 0 ? (
              <UploadPreviewGrid
                files={files}
                selected={selectedFiles}
                onToggle={(index) =>
                  setSelectedFiles((prev) => {
                    const next = new Set(prev);
                    if (next.has(index)) next.delete(index);
                    else next.add(index);
                    return next;
                  })
                }
              />
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </AppModal>
  );
}

function UploadPreviewGrid({
  files,
  selected,
  onToggle,
}: {
  files: File[];
  selected: Set<number>;
  onToggle: (index: number) => void;
}) {
  const urls = React.useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files]
  );

  React.useEffect(
    () => () => {
      urls.forEach((item) => URL.revokeObjectURL(item.url));
    },
    [urls]
  );

  return (
    <div className="grid max-h-[280px] grid-cols-2 gap-3 overflow-auto sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {urls.map(({ file, url }, index) => (
        <div
          role="button"
          tabIndex={0}
          key={`${file.name}-${index}`}
          onClick={() => onToggle(index)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onToggle(index);
            }
          }}
          className={cn(
            'group relative overflow-hidden rounded-md border bg-card text-left transition',
            selected.has(index) && 'ring-2 ring-primary ring-offset-2'
          )}
        >
          <div className="relative aspect-square bg-muted">
            <img src={url} alt={file.name} className="h-full w-full object-cover" />
            <span
              className="absolute left-2 top-2"
              onClick={(event) => {
                event.stopPropagation();
                onToggle(index);
              }}
            >
              <Checkbox
                checked={selected.has(index)}
                onCheckedChange={() => {
                  /* handled by the wrapping span */
                }}
                className="bg-background/90"
                aria-label={`Select ${file.name}`}
              />
            </span>
          </div>
          <div className="truncate p-2 text-xs font-medium" title={file.name}>
            {file.name}
          </div>
        </div>
      ))}
    </div>
  );
}

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
