/**
 * Media-row helpers for the demo seeder.
 *
 * Images are served from Unsplash CDN. Each `storageKey` is the idempotency
 * key — re-runs upsert the same row. Shared assets (e.g. a color swatch used
 * by every red variant) reuse the same `storageKey` so a single media row is
 * referenced by many variants.
 */

import { createHash } from 'node:crypto';
import { media } from '../../src/schema';
import type { Db } from './types';

const UNSPLASH_BASE = 'https://images.unsplash.com';
const IMAGE_SIZE = 800;

/** Returns a cropped Unsplash CDN URL for a given photo ID. */
export function unsplashUrl(id: string): string {
  return `${UNSPLASH_BASE}/${id}?w=${IMAGE_SIZE}&h=${IMAGE_SIZE}&fit=crop&auto=format&q=80`;
}

export function checksumFor(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Stable byte-size derived from the storageKey so re-runs don't churn rows. */
export function deterministicSize(key: string): number {
  let h = 0;
  for (const c of key) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return (Math.abs(h) % 200_000) + 80_000;
}

export interface UpsertMediaInput {
  storageKey: string;
  unsplashId: string;
  fileName: string;
  altText: string;
}

export async function upsertMedia(db: Db, input: UpsertMediaInput): Promise<string> {
  const url = unsplashUrl(input.unsplashId);
  const [row] = await db
    .insert(media)
    .values({
      storageKey: input.storageKey,
      url,
      thumbnailUrl: url,
      fileName: input.fileName,
      mimeType: 'image/jpeg',
      sizeBytes: deterministicSize(input.storageKey),
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      checksumSha256: checksumFor(input.storageKey),
      altText: input.altText,
    })
    .onConflictDoUpdate({
      target: media.storageKey,
      set: { url, thumbnailUrl: url, altText: input.altText },
    })
    .returning({ id: media.id });
  return row.id;
}
