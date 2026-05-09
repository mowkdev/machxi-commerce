import {
  SdkRequestError,
  adminCreatePage,
  adminDeletePage,
  adminListPagesQueryKey,
  adminReplacePageBlocks,
  adminUpdatePage,
  useAdminGetPage,
  useAdminListBlockTypes,
} from '@repo/admin-sdk';
import type {
  BlockTypeMetadata,
  CreatePageBody,
  PageDetailResponse,
  ReplacePageBlocksBody,
  UpdatePageBody,
} from '@repo/types/admin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const cmsPagesQueryPrefix = adminListPagesQueryKey();

export function useCmsPage(id: string) {
  return useAdminGetPage<PageDetailResponse>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data,
    },
  });
}

export function useBlockTypes() {
  return useAdminListBlockTypes<BlockTypeMetadata[]>({
    query: {
      staleTime: Infinity,
      select: (response) => response.data,
    },
  });
}

export function useCreatePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, SdkRequestError, CreatePageBody>({
    mutationFn: async (body) => {
      const res = await adminCreatePage(body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: cmsPagesQueryPrefix });
      toast.success('Page created');
      navigate(`/cms/pages/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create page');
    },
  });
}

export function useUpdatePage(id: string) {
  const queryClient = useQueryClient();

  return useMutation<PageDetailResponse, SdkRequestError, UpdatePageBody>({
    mutationFn: async (body) => {
      const res = await adminUpdatePage(id, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cmsPagesQueryPrefix });
      toast.success('Page saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save page');
    },
  });
}

export function useReplacePageBlocks(id: string) {
  const queryClient = useQueryClient();

  return useMutation<PageDetailResponse, SdkRequestError, ReplacePageBlocksBody>({
    mutationFn: async (body) => {
      const res = await adminReplacePageBlocks(id, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cmsPagesQueryPrefix });
      toast.success('Blocks saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save blocks');
    },
  });
}

export function useDeletePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (id) => {
      await adminDeletePage(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cmsPagesQueryPrefix });
      toast.success('Page deleted');
      navigate('/cms/pages');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete page');
    },
  });
}
