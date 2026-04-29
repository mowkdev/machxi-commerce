import * as React from "react"
import { Link } from "react-router-dom"
import {
  IconCopy,
  IconExternalLink,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
import {
  useDeleteMedia,
  useMediaDetail,
  useReplaceMedia,
  useUpdateMedia,
} from "../hooks"
import { formatBytes, formatDimensions } from "../utils"

interface MediaDetailDrawerProps {
  id: string | null
  onClose: () => void
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml"

export function MediaDetailDrawer({ id, onClose }: MediaDetailDrawerProps) {
  const open = id !== null
  const { data, isPending, isError } = useMediaDetail(id)
  const update = useUpdateMedia(id ?? "")
  const replace = useReplaceMedia(id ?? "")
  const del = useDeleteMedia()
  const replaceInputRef = React.useRef<HTMLInputElement>(null)

  const [form, setForm] = React.useState({
    title: "",
    altText: "",
    caption: "",
    description: "",
  })

  React.useEffect(() => {
    if (data) {
      setForm({
        title: data.title ?? "",
        altText: data.altText ?? "",
        caption: data.caption ?? "",
        description: data.description ?? "",
      })
    }
  }, [data])

  const handleSave = () => {
    if (!data) return
    update.mutate({
      title: form.title || null,
      altText: form.altText || null,
      caption: form.caption || null,
      description: form.description || null,
    })
  }

  const handleDelete = () => {
    if (!id) return
    del.mutate(id, { onSuccess: () => onClose() })
  }

  const handleCopyUrl = async () => {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.url)
      toast.success("URL copied")
    } catch {
      toast.error("Could not access clipboard")
    }
  }

  const handleReplaceClick = () => replaceInputRef.current?.click()
  const handleReplaceFile = (file: File | undefined) => {
    if (!file) return
    replace.mutate(file)
  }

  const altWarning = !form.altText.trim() && open

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          if (altWarning) {
            toast.warning("This image has no alt text — add one for SEO and accessibility.")
          }
          onClose()
        }
      }}
    >
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[41.4rem]">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="truncate text-base">
            {data?.title || data?.fileName || "Media"}
          </SheetTitle>
          <SheetDescription className="truncate text-xs">
            {data?.fileName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isPending ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : isError || !data ? (
            <div className="p-6 text-sm text-destructive">Failed to load.</div>
          ) : (
            <div className="space-y-5 p-5">
              <div className="flex items-center justify-center rounded-md border bg-muted/30 p-2">
                <img
                  src={data.url}
                  alt={data.altText ?? data.fileName}
                  className="max-h-72 max-w-full object-contain"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleCopyUrl}>
                  <IconCopy className="size-4" /> Copy URL
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={data.url} target="_blank" rel="noreferrer">
                    <IconExternalLink className="size-4" /> Open
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReplaceClick}
                  disabled={replace.isPending}
                >
                  <IconRefresh className="size-4" />
                  {replace.isPending ? "Replacing…" : "Replace"}
                </Button>
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    handleReplaceFile(e.target.files?.[0])
                    e.target.value = ""
                  }}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="ml-auto">
                      <IconTrash className="size-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this media?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {data.usage.products.length + data.usage.variants.length > 0
                          ? `Used in ${data.usage.products.length} product${
                              data.usage.products.length === 1 ? "" : "s"
                            } and ${data.usage.variants.length} variant${
                              data.usage.variants.length === 1 ? "" : "s"
                            }. Deleting will leave broken references.`
                          : "This media is not currently used."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-3 text-xs">
                <Detail label="Type" value={data.mimeType} />
                <Detail label="Size" value={formatBytes(data.sizeBytes)} />
                <Detail
                  label="Dimensions"
                  value={formatDimensions(data.width, data.height) ?? "—"}
                />
                <Detail
                  label="Uploaded"
                  value={new Date(data.createdAt).toLocaleString()}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="alt">
                    Alt text{" "}
                    {altWarning && (
                      <span className="text-amber-600 dark:text-amber-400">
                        · recommended for SEO &amp; accessibility
                      </span>
                    )}
                  </Label>
                  <Input
                    id="alt"
                    value={form.altText}
                    onChange={(e) => setForm({ ...form, altText: e.target.value })}
                    placeholder="Describe the image for screen readers"
                  />
                </div>
                <div>
                  <Label htmlFor="caption">Caption</Label>
                  <Input
                    id="caption"
                    value={form.caption}
                    onChange={(e) => setForm({ ...form, caption: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={update.isPending}
                  className="w-full"
                >
                  {update.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>

              <Separator />

              <div>
                <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                  Used in
                </Label>
                {data.usage.products.length === 0 && data.usage.variants.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Not currently used.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {data.usage.products.map((p) => (
                      <li key={`p-${p.id}`}>
                        <Link
                          to={`/products/${p.id}`}
                          className="text-primary hover:underline"
                        >
                          {p.title ?? "Untitled product"}
                        </Link>
                      </li>
                    ))}
                    {data.usage.variants.map((v) => (
                      <li key={`v-${v.id}`} className="text-muted-foreground">
                        Variant{" "}
                        <Link
                          to={`/products/${v.productId}`}
                          className="text-primary hover:underline"
                        >
                          {v.sku ?? v.id.slice(0, 8)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
