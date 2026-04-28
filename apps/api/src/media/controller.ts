import type { Context } from 'hono';
import type { AppEnv } from '../context';
import { notFound, validationFailed } from '../lib/errors';
import { parseBody } from '../lib/validate';
import { ok } from '../lib/response';
import { bulkDeleteBody, updateMediaBody } from '@repo/types/admin';
import { listMediaQuery, mediaIdParam } from './schema';
import {
  bulkSoftDelete,
  getMedia,
  listMedia,
  replaceMediaFile,
  softDeleteMedia,
  updateMediaMetadata,
  uploadMedia,
  type UploadFileInput,
} from './service';

async function readUploadedFiles(c: Context<AppEnv>): Promise<UploadFileInput[]> {
  let body: Record<string, unknown>;
  try {
    body = await c.req.parseBody({ all: true });
  } catch {
    throw validationFailed('Request must be multipart/form-data');
  }

  const raw = body['files'] ?? body['file'];
  const items: unknown[] = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
  const files: UploadFileInput[] = [];
  for (const item of items) {
    if (item instanceof File) {
      const buf = Buffer.from(await item.arrayBuffer());
      files.push({ fileName: item.name || 'upload', data: buf });
    }
  }
  if (files.length === 0) {
    throw validationFailed('No files provided. Use form field "files" or "file".');
  }
  return files;
}

export async function listMediaController(c: Context<AppEnv>) {
  const parsed = listMediaQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries())
  );
  if (!parsed.success) {
    throw validationFailed('Invalid query parameters', { issues: parsed.error.issues });
  }
  const result = await listMedia(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getMediaController(c: Context<AppEnv>) {
  const params = mediaIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid media ID', { issues: params.error.issues });
  }
  const detail = await getMedia(params.data.id);
  if (!detail) throw notFound('Media not found');
  return ok(c, detail);
}

export async function uploadMediaController(c: Context<AppEnv>) {
  const principal = c.get('principal');
  const files = await readUploadedFiles(c);
  const result = await uploadMedia(files, principal?.userId ?? null);
  return ok(c, result, undefined, 201);
}

export async function updateMediaController(c: Context<AppEnv>) {
  const params = mediaIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid media ID', { issues: params.error.issues });
  }
  const body = await parseBody(c, updateMediaBody);
  const updated = await updateMediaMetadata(params.data.id, body);
  if (!updated) throw notFound('Media not found');
  return ok(c, updated);
}

export async function replaceMediaController(c: Context<AppEnv>) {
  const params = mediaIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid media ID', { issues: params.error.issues });
  }
  const files = await readUploadedFiles(c);
  if (files.length !== 1) {
    throw validationFailed('Replace expects exactly one file');
  }
  const updated = await replaceMediaFile(params.data.id, files[0]);
  if (!updated) throw notFound('Media not found');
  return ok(c, updated);
}

export async function deleteMediaController(c: Context<AppEnv>) {
  const params = mediaIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid media ID', { issues: params.error.issues });
  }
  const ok_ = await softDeleteMedia(params.data.id);
  if (!ok_) throw notFound('Media not found');
  return ok(c, { id: params.data.id });
}

export async function bulkDeleteMediaController(c: Context<AppEnv>) {
  const body = await parseBody(c, bulkDeleteBody);
  const result = await bulkSoftDelete(body.ids);
  return ok(c, result);
}
