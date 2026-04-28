import { api } from '@/lib/api';
import type {
  MediaDetail,
  MediaListItem,
  MediaUploadResult,
  UpdateMediaBody,
} from '@repo/types/admin';
import type { PaginationMeta } from '@repo/types';

export interface ListMediaParams {
  page: number;
  pageSize: number;
  search?: string;
  mimeType?: string;
  sortBy?: 'createdAt' | 'fileName' | 'sizeBytes';
  sortOrder?: 'asc' | 'desc';
}

export async function listMedia(
  params: ListMediaParams
): Promise<{ data: MediaListItem[]; meta: PaginationMeta }> {
  const query: Record<string, string> = {
    page: String(params.page),
    pageSize: String(params.pageSize),
  };
  if (params.search) query.search = params.search;
  if (params.mimeType) query.mimeType = params.mimeType;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  const res = await api.get<{ data: MediaListItem[]; meta: PaginationMeta }>(
    '/api/media',
    { params: query }
  );
  return res.data;
}

export async function getMedia(id: string): Promise<MediaDetail> {
  const res = await api.get<MediaDetail>(`/api/media/${id}`);
  return res.data;
}

export async function uploadMedia(files: File[]): Promise<MediaUploadResult> {
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  const res = await api.post<MediaUploadResult>('/api/media', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function updateMedia(
  id: string,
  body: UpdateMediaBody
): Promise<MediaListItem> {
  const res = await api.patch<MediaListItem>(`/api/media/${id}`, body);
  return res.data;
}

export async function replaceMedia(id: string, file: File): Promise<MediaListItem> {
  const fd = new FormData();
  fd.append('files', file);
  const res = await api.post<MediaListItem>(`/api/media/${id}/replace`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deleteMedia(id: string): Promise<void> {
  await api.delete(`/api/media/${id}`);
}

export async function bulkDeleteMedia(ids: string[]): Promise<{ deleted: number }> {
  const res = await api.post<{ deleted: number }>('/api/media/bulk-delete', { ids });
  return res.data;
}

export const mediaKeys = {
  all: ['media'] as const,
  list: (params?: ListMediaParams) =>
    params ? (['media', 'list', params] as const) : (['media', 'list'] as const),
  detail: (id: string) => ['media', 'detail', id] as const,
};
