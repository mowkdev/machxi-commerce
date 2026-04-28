import { z } from 'zod';

export const ALLOWED_MEDIA_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
] as const;
export type AllowedMediaMime = (typeof ALLOWED_MEDIA_MIME)[number];

export const updateMediaBody = z.object({
  title: z.string().max(255).nullable().optional(),
  altText: z.string().max(500).nullable().optional(),
  caption: z.string().max(500).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});
export type UpdateMediaBody = z.infer<typeof updateMediaBody>;

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});
export type BulkDeleteBody = z.infer<typeof bulkDeleteBody>;

export interface MediaListItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  altText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaUsage {
  products: { id: string; title: string | null }[];
  variants: { id: string; sku: string | null; productId: string }[];
}

export interface MediaDetail extends MediaListItem {
  storageKey: string;
  thumbnailKey: string | null;
  caption: string | null;
  description: string | null;
  checksumSha256: string;
  usage: MediaUsage;
}

export interface MediaUploadResult {
  uploaded: MediaListItem[];
  failed: { fileName: string; error: string }[];
}
