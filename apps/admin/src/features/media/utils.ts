export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatDimensions(w: number | null, h: number | null): string | null {
  if (w == null || h == null) return null;
  return `${w} × ${h}`;
}

export function shortMime(mime: string): string {
  return mime.replace(/^image\//, '').toUpperCase();
}
