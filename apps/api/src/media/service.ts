import { createHash } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { customAlphabet } from 'nanoid';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { db } from '@repo/database/client';
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, like, sql } from '@repo/database';
import {
  media,
  productMedia,
  productTranslations,
  products,
  productVariants,
  variantMedia,
} from '@repo/database/schema';
import type {
  MediaDetail,
  MediaListItem,
  MediaUploadResult,
  UpdateMediaBody,
} from '@repo/types/admin';
import { ALLOWED_MEDIA_MIME } from '@repo/types/admin';
import type { PaginationMeta } from '@repo/types';
import { env } from '../env';
import { storage } from '../lib/storage';
import { validationFailed } from '../lib/errors';
import type { ListMediaQuery } from './schema';

const ALLOWED = new Set<string>(ALLOWED_MEDIA_MIME);
const SORT_COLUMNS = {
  createdAt: media.createdAt,
  fileName: media.fileName,
  sizeBytes: media.sizeBytes,
} as const;

// Filename-friendly id without ambiguous chars.
const nanoidKey = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

// dompurify's WindowLike type is a strict subset of jsdom's Window; the cast is
// safe (the runtime API matches) but TypeScript can't reconcile the structural
// types without help.
const purify = createDOMPurify(
  new JSDOM('').window as unknown as Parameters<typeof createDOMPurify>[0]
);

// ── Helpers ─────────────────────────────────────────────────────────────────

function slugifyFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'file';
  return ext ? `${slug}.${ext}` : slug;
}

function buildKey(fileName: string, ext: string): string {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const id = nanoidKey();
  const slug = slugifyFileName(fileName);
  // Force the extension we picked from sniffing so the key matches the bytes.
  const dot = slug.lastIndexOf('.');
  const base = dot > 0 ? slug.slice(0, dot) : slug;
  return `media/${yyyy}/${mm}/${id}-${base}.${ext}`;
}

function thumbnailKeyFor(originalKey: string): string {
  return originalKey.replace(/^media\//, 'media/thumbs/').replace(/\.[^./]+$/, '.webp');
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function pickExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/avif': return 'avif';
    case 'image/gif': return 'gif';
    case 'image/svg+xml': return 'svg';
    default: return 'bin';
  }
}

function toListItem(row: typeof media.$inferSelect): MediaListItem {
  return {
    id: row.id,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    url: row.url,
    thumbnailUrl: row.thumbnailUrl,
    title: row.title,
    altText: row.altText,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Upload ──────────────────────────────────────────────────────────────────

export interface UploadFileInput {
  fileName: string;
  data: Buffer;
}

export async function uploadMedia(
  files: UploadFileInput[],
  uploadedById: string | null
): Promise<MediaUploadResult> {
  if (files.length === 0) {
    throw validationFailed('No files provided');
  }

  const uploaded: MediaListItem[] = [];
  const failed: { fileName: string; error: string }[] = [];

  // Sequential ingest keeps memory predictable; parallelize later if needed.
  for (const f of files) {
    try {
      uploaded.push(await ingestOne(f, uploadedById));
    } catch (e) {
      failed.push({ fileName: f.fileName, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return { uploaded, failed };
}

async function ingestOne(
  file: UploadFileInput,
  uploadedById: string | null
): Promise<MediaListItem> {
  if (file.data.length === 0) throw new Error('Empty file');
  if (file.data.length > env.MEDIA_MAX_BYTES) {
    throw new Error(`File exceeds ${env.MEDIA_MAX_BYTES} bytes`);
  }

  // SVG bypasses file-type sniffing (file-type is binary-format-only).
  // Detect SVG by leading whitespace + tag, then sanitize.
  let mimeType: string;
  let bytes: Buffer = file.data;
  const head = file.data.subarray(0, 256).toString('utf8').trimStart().toLowerCase();
  if (head.startsWith('<svg') || head.includes('<svg')) {
    mimeType = 'image/svg+xml';
    const cleaned = purify.sanitize(file.data.toString('utf8'), {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
    bytes = Buffer.from(cleaned, 'utf8');
  } else {
    const sniffed = await fileTypeFromBuffer(file.data);
    if (!sniffed) throw new Error('Could not determine file type');
    mimeType = sniffed.mime;
  }

  if (!ALLOWED.has(mimeType)) {
    throw new Error(`Disallowed MIME type: ${mimeType}`);
  }

  const checksum = sha256(bytes);

  // Dedup: return the existing record if checksum matches and it's not deleted.
  const existing = await db
    .select()
    .from(media)
    .where(and(eq(media.checksumSha256, checksum), isNull(media.deletedAt)))
    .limit(1);
  if (existing[0]) return toListItem(existing[0]);

  let width: number | null = null;
  let height: number | null = null;
  let processed: Buffer = bytes;
  let thumbnail: Buffer | null = null;

  if (mimeType === 'image/svg+xml') {
    // Don't process SVG with sharp (we already sanitized).
    width = null;
    height = null;
  } else {
    const img = sharp(bytes, { failOn: 'error' });
    const meta = await img.metadata();
    width = typeof meta.width === 'number' ? meta.width : null;
    height = typeof meta.height === 'number' ? meta.height : null;

    // Strip metadata (EXIF etc.) on the original.
    processed = await sharp(bytes).rotate().withMetadata({}).toBuffer();

    // 400×400 webp thumbnail, fit=cover.
    thumbnail = await sharp(bytes)
      .rotate()
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82 })
      .toBuffer();
  }

  const ext = pickExt(mimeType);
  const storageKey = buildKey(file.fileName, ext);
  const thumbKey = thumbnail ? thumbnailKeyFor(storageKey) : null;

  // Upload original + thumbnail in parallel.
  await Promise.all([
    storage.put(storageKey, processed, { contentType: mimeType }),
    thumbnail && thumbKey
      ? storage.put(thumbKey, thumbnail, { contentType: 'image/webp' })
      : Promise.resolve(),
  ]);

  try {
    const [row] = await db
      .insert(media)
      .values({
        storageKey,
        thumbnailKey: thumbKey,
        url: storage.publicUrl(storageKey),
        thumbnailUrl: thumbKey ? storage.publicUrl(thumbKey) : null,
        fileName: file.fileName,
        mimeType,
        sizeBytes: processed.length,
        width,
        height,
        checksumSha256: checksum,
        metadata: uploadedById ? { uploadedById } : null,
      })
      .returning();
    return toListItem(row);
  } catch (e) {
    // Roll back the S3 writes on DB failure to avoid orphans.
    await Promise.all([
      storage.delete(storageKey).catch(() => {}),
      thumbKey ? storage.delete(thumbKey).catch(() => {}) : Promise.resolve(),
    ]);
    throw e;
  }
}

// ── List ────────────────────────────────────────────────────────────────────

export async function listMedia(
  query: ListMediaQuery
): Promise<{ data: MediaListItem[]; meta: PaginationMeta }> {
  const search = query.search ? `%${query.search}%` : undefined;
  const mimePrefix = query.mimeType ? `${query.mimeType}%` : undefined;

  const where = and(
    isNull(media.deletedAt),
    search
      ? or(
          ilike(media.fileName, search),
          ilike(media.title, search),
          ilike(media.altText, search)
        )
      : undefined,
    mimePrefix ? like(media.mimeType, mimePrefix) : undefined
  );

  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const [rows, totalRow] = await Promise.all([
    db.select().from(media).where(where).orderBy(orderBy).limit(query.pageSize).offset(offset),
    db.select({ count: count() }).from(media).where(where),
  ]);

  const total = totalRow[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

  return {
    data: rows.map(toListItem),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: total,
      totalPages,
    },
  };
}

// ── Detail ──────────────────────────────────────────────────────────────────

export async function getMedia(id: string): Promise<MediaDetail | null> {
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!row || row.deletedAt) return null;

  const [productRows, variantRows] = await Promise.all([
    db
      .select({
        id: products.id,
        title: productTranslations.name,
      })
      .from(productMedia)
      .innerJoin(products, eq(products.id, productMedia.productId))
      .leftJoin(productTranslations, eq(productTranslations.productId, products.id))
      .where(eq(productMedia.mediaId, id)),
    db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        productId: productVariants.productId,
      })
      .from(variantMedia)
      .innerJoin(productVariants, eq(productVariants.id, variantMedia.variantId))
      .where(eq(variantMedia.mediaId, id)),
  ]);

  // Dedup product rows on id (translations join can multiply).
  const seen = new Set<string>();
  const productList: { id: string; title: string | null }[] = [];
  for (const p of productRows) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    productList.push({ id: p.id, title: p.title });
  }

  return {
    ...toListItem(row),
    storageKey: row.storageKey,
    thumbnailKey: row.thumbnailKey,
    caption: row.caption,
    description: row.description,
    checksumSha256: row.checksumSha256,
    usage: { products: productList, variants: variantRows },
  };
}

// ── Update metadata ─────────────────────────────────────────────────────────

export async function updateMediaMetadata(
  id: string,
  body: UpdateMediaBody
): Promise<MediaListItem | null> {
  const patch: Partial<typeof media.$inferInsert> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.altText !== undefined) patch.altText = body.altText;
  if (body.caption !== undefined) patch.caption = body.caption;
  if (body.description !== undefined) patch.description = body.description;

  if (Object.keys(patch).length === 0) {
    const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
    return row ? toListItem(row) : null;
  }

  const [row] = await db
    .update(media)
    .set(patch)
    .where(and(eq(media.id, id), isNull(media.deletedAt)))
    .returning();
  return row ? toListItem(row) : null;
}

// ── Replace file ────────────────────────────────────────────────────────────

export async function replaceMediaFile(
  id: string,
  file: UploadFileInput
): Promise<MediaListItem | null> {
  const [existing] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!existing || existing.deletedAt) return null;

  // Re-ingest using the same path as upload, but write to a fresh key and
  // then update the existing row in place. Old objects are deleted after the
  // row is updated so a failure mid-flight leaves the original intact.
  const oldKeys = [existing.storageKey, existing.thumbnailKey].filter(
    (k): k is string => Boolean(k)
  );

  // Sniff + sanitize + thumbnail (mirror of ingestOne).
  let mimeType: string;
  let bytes: Buffer = file.data;
  const head = file.data.subarray(0, 256).toString('utf8').trimStart().toLowerCase();
  if (head.startsWith('<svg') || head.includes('<svg')) {
    mimeType = 'image/svg+xml';
    bytes = Buffer.from(
      purify.sanitize(file.data.toString('utf8'), {
        USE_PROFILES: { svg: true, svgFilters: true },
      }),
      'utf8'
    );
  } else {
    const sniffed = await fileTypeFromBuffer(file.data);
    if (!sniffed) throw new Error('Could not determine file type');
    mimeType = sniffed.mime;
  }
  if (!ALLOWED.has(mimeType)) throw new Error(`Disallowed MIME type: ${mimeType}`);
  if (bytes.length === 0) throw new Error('Empty file');
  if (bytes.length > env.MEDIA_MAX_BYTES) {
    throw new Error(`File exceeds ${env.MEDIA_MAX_BYTES} bytes`);
  }

  const checksum = sha256(bytes);

  let width: number | null = null;
  let height: number | null = null;
  let processed: Buffer = bytes;
  let thumbnail: Buffer | null = null;

  if (mimeType !== 'image/svg+xml') {
    const meta = await sharp(bytes).metadata();
    width = typeof meta.width === 'number' ? meta.width : null;
    height = typeof meta.height === 'number' ? meta.height : null;
    processed = await sharp(bytes).rotate().withMetadata({}).toBuffer();
    thumbnail = await sharp(bytes)
      .rotate()
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82 })
      .toBuffer();
  }

  const ext = pickExt(mimeType);
  const storageKey = buildKey(file.fileName, ext);
  const thumbKey = thumbnail ? thumbnailKeyFor(storageKey) : null;

  await Promise.all([
    storage.put(storageKey, processed, { contentType: mimeType }),
    thumbnail && thumbKey
      ? storage.put(thumbKey, thumbnail, { contentType: 'image/webp' })
      : Promise.resolve(),
  ]);

  try {
    const [row] = await db
      .update(media)
      .set({
        storageKey,
        thumbnailKey: thumbKey,
        url: storage.publicUrl(storageKey),
        thumbnailUrl: thumbKey ? storage.publicUrl(thumbKey) : null,
        fileName: file.fileName,
        mimeType,
        sizeBytes: processed.length,
        width,
        height,
        checksumSha256: checksum,
      })
      .where(eq(media.id, id))
      .returning();

    // After the row is updated, delete the previous objects.
    if (oldKeys.length > 0) {
      await storage.deleteMany(oldKeys).catch(() => {});
    }
    return row ? toListItem(row) : null;
  } catch (e) {
    await Promise.all([
      storage.delete(storageKey).catch(() => {}),
      thumbKey ? storage.delete(thumbKey).catch(() => {}) : Promise.resolve(),
    ]);
    throw e;
  }
}

// ── Soft delete ─────────────────────────────────────────────────────────────

export async function softDeleteMedia(id: string): Promise<boolean> {
  const [row] = await db
    .update(media)
    .set({ deletedAt: sql`NOW()` })
    .where(and(eq(media.id, id), isNull(media.deletedAt)))
    .returning({ id: media.id, storageKey: media.storageKey, thumbnailKey: media.thumbnailKey });
  if (!row) return false;

  const keys: string[] = [row.storageKey];
  if (row.thumbnailKey) keys.push(row.thumbnailKey);
  await storage.deleteMany(keys).catch(() => {});
  return true;
}

export async function bulkSoftDelete(ids: string[]): Promise<{ deleted: number }> {
  if (ids.length === 0) return { deleted: 0 };
  const rows = await db
    .update(media)
    .set({ deletedAt: sql`NOW()` })
    .where(and(inArray(media.id, ids), isNull(media.deletedAt)))
    .returning({ storageKey: media.storageKey, thumbnailKey: media.thumbnailKey });

  const keys: string[] = [];
  for (const r of rows) {
    keys.push(r.storageKey);
    if (r.thumbnailKey) keys.push(r.thumbnailKey);
  }
  if (keys.length > 0) await storage.deleteMany(keys).catch(() => {});
  return { deleted: rows.length };
}
