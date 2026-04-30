import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  SdkRequestError,
  adminCreatePriceList,
  adminCreatePriceListPrice,
  adminDeletePriceList,
  adminDeletePriceListPrice,
  adminGetPriceListQueryKey,
  adminListPriceListPricesQueryKey,
  adminListPriceListsQueryKey,
  adminUpdatePriceList,
  adminUpdatePriceListPrice,
  useAdminGetPriceList,
  useAdminListPriceSetTargets,
} from '@repo/admin-sdk';
import type {
  CreatePriceListBody,
  CreatePriceListPriceBody,
  PriceListDetail,
  PriceListPrice,
  PriceSetTarget,
  UpdatePriceListBody,
  UpdatePriceListPriceBody,
} from '@repo/types/admin';

export const priceListsQueryPrefix = adminListPriceListsQueryKey();

function useInvalidatePriceList(priceListId: string) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: priceListsQueryPrefix });
    queryClient.invalidateQueries({ queryKey: adminGetPriceListQueryKey(priceListId) });
    queryClient.invalidateQueries({ queryKey: adminListPriceListPricesQueryKey(priceListId) });
  };
}

export function usePriceList(id: string) {
  return useAdminGetPriceList<PriceListDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data,
    },
  });
}

export function usePriceSetTargets(search?: string) {
  return useAdminListPriceSetTargets<PriceSetTarget[]>(
    {
      pageSize: 200,
      search: search?.trim() || undefined,
      sortBy: 'productName',
      sortOrder: 'asc',
    },
    {
      query: {
        staleTime: 5 * 60 * 1000,
        select: (response) => response.data,
      },
    }
  );
}

export function useCreatePriceList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, SdkRequestError, CreatePriceListBody>({
    mutationFn: async (body) => {
      const res = await adminCreatePriceList(body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: priceListsQueryPrefix });
      toast.success('Price list created');
      navigate(`/price-lists/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create price list');
    },
  });
}

export function useUpdatePriceList(id: string) {
  const queryClient = useQueryClient();

  return useMutation<PriceListDetail, SdkRequestError, UpdatePriceListBody>({
    mutationFn: async (body) => {
      const res = await adminUpdatePriceList(id, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: priceListsQueryPrefix });
      queryClient.invalidateQueries({ queryKey: adminGetPriceListQueryKey(id) });
      toast.success('Price list saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save price list');
    },
  });
}

export function useCreatePriceListPrice(priceListId: string) {
  const invalidatePriceList = useInvalidatePriceList(priceListId);

  return useMutation<PriceListPrice, SdkRequestError, CreatePriceListPriceBody>({
    mutationFn: async (body) => {
      const res = await adminCreatePriceListPrice(priceListId, body);
      return res.data;
    },
    onSuccess: () => {
      invalidatePriceList();
      toast.success('Price override added');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add price override');
    },
  });
}

export function useUpdatePriceListPrice(priceListId: string) {
  const invalidatePriceList = useInvalidatePriceList(priceListId);

  return useMutation<
    PriceListPrice,
    SdkRequestError,
    { priceId: string; body: UpdatePriceListPriceBody }
  >({
    mutationFn: async ({ priceId, body }) => {
      const res = await adminUpdatePriceListPrice(priceListId, priceId, body);
      return res.data;
    },
    onSuccess: () => {
      invalidatePriceList();
      toast.success('Price override saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save price override');
    },
  });
}

export function useDeletePriceListPrice(priceListId: string) {
  const invalidatePriceList = useInvalidatePriceList(priceListId);

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (priceId) => {
      await adminDeletePriceListPrice(priceListId, priceId);
    },
    onSuccess: () => {
      invalidatePriceList();
      toast.success('Price override deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete price override');
    },
  });
}

export function useDeletePriceList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (id) => {
      await adminDeletePriceList(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: priceListsQueryPrefix });
      toast.success('Price list deleted');
      navigate('/price-lists');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete price list');
    },
  });
}
