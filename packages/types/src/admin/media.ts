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

export const mediaListItem = z.object({
  id: z.string().uuid(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  url: z.string(),
  thumbnailUrl: z.string().nullable(),
  title: z.string().nullable(),
  altText: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MediaListItem = z.infer<typeof mediaListItem>;

export const mediaUsage = z.object({
  products: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string().nullable(),
    })
  ),
  variants: z.array(
    z.object({
      id: z.string().uuid(),
      sku: z.string().nullable(),
      productId: z.string().uuid(),
    })
  ),
});
export type MediaUsage = z.infer<typeof mediaUsage>;

export const mediaDetail = mediaListItem.extend({
  storageKey: z.string(),
  thumbnailKey: z.string().nullable(),
  caption: z.string().nullable(),
  description: z.string().nullable(),
  checksumSha256: z.string(),
  usage: mediaUsage,
});
export type MediaDetail = z.infer<typeof mediaDetail>;

export const mediaUploadResult = z.object({
  uploaded: z.array(mediaListItem),
  failed: z.array(
    z.object({
      fileName: z.string(),
      error: z.string(),
    })
  ),
});
export type MediaUploadResult = z.infer<typeof mediaUploadResult>;
