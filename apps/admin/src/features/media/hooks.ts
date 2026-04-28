import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiRequestError } from '@/lib/api';
import type {
  MediaDetail,
  MediaListItem,
  MediaUploadResult,
  UpdateMediaBody,
} from '@repo/types/admin';
import type { PaginationMeta } from '@repo/types';
import {
  bulkDeleteMedia,
  deleteMedia,
  getMedia,
  listMedia,
  mediaKeys,
  replaceMedia,
  updateMedia,
  uploadMedia,
  type ListMediaParams,
} from './api';

export function useMediaList(params: ListMediaParams) {
  return useQuery<{ data: MediaListItem[]; meta: PaginationMeta }, ApiRequestError>({
    queryKey: mediaKeys.list(params),
    queryFn: () => listMedia(params),
    placeholderData: keepPreviousData,
  });
}

export function useMediaDetail(id: string | null) {
  return useQuery<MediaDetail, ApiRequestError>({
    queryKey: id ? mediaKeys.detail(id) : ['media', 'detail', 'none'],
    queryFn: () => getMedia(id as string),
    enabled: Boolean(id),
  });
}

export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation<MediaUploadResult, ApiRequestError, File[]>({
    mutationFn: uploadMedia,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
      const ok = result.uploaded.length;
      const bad = result.failed.length;
      if (ok > 0 && bad === 0) {
        toast.success(`Uploaded ${ok} file${ok === 1 ? '' : 's'}`);
      } else if (ok > 0 && bad > 0) {
        toast.warning(
          `Uploaded ${ok}, ${bad} failed: ${result.failed.map((f) => f.fileName).join(', ')}`
        );
      } else if (bad > 0) {
        toast.error(
          `Upload failed: ${result.failed.map((f) => `${f.fileName} (${f.error})`).join(', ')}`
        );
      }
    },
    onError: (err) => toast.error(err.message || 'Upload failed'),
  });
}

export function useUpdateMedia(id: string) {
  const qc = useQueryClient();
  return useMutation<MediaListItem, ApiRequestError, UpdateMediaBody>({
    mutationFn: (body) => updateMedia(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success('Media saved');
    },
    onError: (err) => toast.error(err.message || 'Save failed'),
  });
}

export function useReplaceMedia(id: string) {
  const qc = useQueryClient();
  return useMutation<MediaListItem, ApiRequestError, File>({
    mutationFn: (file) => replaceMedia(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success('File replaced');
    },
    onError: (err) => toast.error(err.message || 'Replace failed'),
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation<void, ApiRequestError, string>({
    mutationFn: deleteMedia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success('Media deleted');
    },
    onError: (err) => toast.error(err.message || 'Delete failed'),
  });
}

export function useBulkDeleteMedia() {
  const qc = useQueryClient();
  return useMutation<{ deleted: number }, ApiRequestError, string[]>({
    mutationFn: bulkDeleteMedia,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success(`Deleted ${r.deleted} item${r.deleted === 1 ? '' : 's'}`);
    },
    onError: (err) => toast.error(err.message || 'Bulk delete failed'),
  });
}
