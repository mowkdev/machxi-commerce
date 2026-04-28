import * as React from "react"
import { IconCloudUpload } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUploadMedia } from "../hooks"

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml"

interface MediaUploadDropzoneProps {
  className?: string
  variant?: "inline" | "button"
}

export function MediaUploadDropzone({
  className,
  variant = "inline",
}: MediaUploadDropzoneProps) {
  const upload = useUploadMedia()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = React.useState(false)
  const dragCounter = React.useRef(0)

  const onSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return
    upload.mutate(Array.from(files))
  }

  if (variant === "button") {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            onSelect(e.target.files)
            e.target.value = ""
          }}
        />
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className={className}
        >
          <IconCloudUpload className="size-4" />
          {upload.isPending ? "Uploading…" : "Upload"}
        </Button>
      </>
    )
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault()
        dragCounter.current += 1
        setDragActive(true)
      }}
      onDragLeave={() => {
        dragCounter.current -= 1
        if (dragCounter.current <= 0) {
          dragCounter.current = 0
          setDragActive(false)
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        dragCounter.current = 0
        setDragActive(false)
        onSelect(e.dataTransfer.files)
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-8 text-center transition",
        dragActive ? "border-primary bg-primary/5" : "border-border bg-muted/30",
        className
      )}
    >
      <IconCloudUpload className="size-8 text-muted-foreground" />
      <div className="text-sm">
        <span className="font-medium">Drop files here</span>
        <span className="text-muted-foreground"> or </span>
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => inputRef.current?.click()}
        >
          browse
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        JPEG, PNG, WebP, AVIF, GIF, SVG · up to 25 MB each
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          onSelect(e.target.files)
          e.target.value = ""
        }}
      />
      {upload.isPending && (
        <p className="text-xs text-muted-foreground">Uploading…</p>
      )}
    </div>
  )
}
