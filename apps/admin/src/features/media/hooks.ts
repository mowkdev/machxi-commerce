import {
  keepPreviousData,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  SdkRequestError,
  adminBulkDeleteMedia,
  adminDeleteMedia,
  adminReplaceMedia,
  adminUpdateMedia,
  adminUploadMedia,
  useAdminGetMedia,
  useAdminListMedia,
  type AdminListMediaQueryParamsSortByEnumKey,
  type AdminListMediaQueryParamsSortOrderEnumKey,
} from '@repo/admin-sdk';
import type {
  MediaDetail,
  MediaListItem,
  MediaUploadResult,
  UpdateMediaBody,
} from '@repo/types/admin';
import type { PaginationMeta } from '@repo/types';

export const mediaQueryPrefix = [{ url: '/api/media' }] as const;

export interface ListMediaParams {
  page: number;
  pageSize: number;
  search?: string;
  mimeType?: string;
  sortBy?: AdminListMediaQueryParamsSortByEnumKey;
  sortOrder?: AdminListMediaQueryParamsSortOrderEnumKey;
}

export function useMediaList(params: ListMediaParams) {
  return useAdminListMedia<{ data: MediaListItem[]; meta: PaginationMeta }>(
    params,
    {
      query: {
        placeholderData: keepPreviousData,
        select: (response) => ({ data: response.data, meta: response.meta }),
      },
    }
  );
}

export function useMediaDetail(id: string | null) {
  return useAdminGetMedia<MediaDetail>(id ?? '', {
    query: {
      enabled: Boolean(id),
      select: (response) => response.data,
    },
  });
}

export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation<MediaUploadResult, SdkRequestError, File[]>({
    mutationFn: async (files) => {
      const res = await adminUploadMedia({ files });
      return res.data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: mediaQueryPrefix });
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
  return useMutation<MediaListItem, SdkRequestError, UpdateMediaBody>({
    mutationFn: async (body) => {
      const res = await adminUpdateMedia(id, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaQueryPrefix });
      toast.success('Media saved');
    },
    onError: (err) => toast.error(err.message || 'Save failed'),
  });
}

export function useReplaceMedia(id: string) {
  const qc = useQueryClient();
  return useMutation<MediaListItem, SdkRequestError, File>({
    mutationFn: async (file) => {
      const res = await adminReplaceMedia(id, { files: [file] });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaQueryPrefix });
      toast.success('File replaced');
    },
    onError: (err) => toast.error(err.message || 'Replace failed'),
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (id) => {
      await adminDeleteMedia(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaQueryPrefix });
      toast.success('Media deleted');
    },
    onError: (err) => toast.error(err.message || 'Delete failed'),
  });
}

export function useBulkDeleteMedia() {
  const qc = useQueryClient();
  return useMutation<{ deleted: number }, SdkRequestError, string[]>({
    mutationFn: async (ids) => {
      const res = await adminBulkDeleteMedia({ ids });
      return res.data;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: mediaQueryPrefix });
      toast.success(`Deleted ${r.deleted} item${r.deleted === 1 ? '' : 's'}`);
    },
    onError: (err) => toast.error(err.message || 'Bulk delete failed'),
  });
}
