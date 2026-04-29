import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  SdkRequestError,
  adminCreateStockLocation,
  adminDeleteStockLocation,
  adminListStockLocationsQueryKey,
  adminUpdateStockLocation,
  useAdminGetStockLocation,
  useAdminListStockLocations,
} from '@repo/admin-sdk';
import type {
  CreateStockLocationBody,
  StockLocationDetail,
  StockLocationListItem,
  UpdateStockLocationBody,
} from '@repo/types/admin';

// Query hooks compose generated SDK hooks directly. Mutation hooks wrap raw SDK
// clients so app concerns stay local: toast, navigation, and cache invalidation.
export const stockLocationsQueryPrefix = adminListStockLocationsQueryKey();

export function useStockLocation(id: string) {
  return useAdminGetStockLocation<StockLocationDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data,
    },
  });
}

export function useStockLocationOptions() {
  return useAdminListStockLocations<StockLocationListItem[]>(
    { pageSize: 200 },
    {
      query: {
        staleTime: 5 * 60 * 1000,
        select: (response) => response.data,
      },
    }
  );
}

export function useCreateStockLocation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, SdkRequestError, CreateStockLocationBody>({
    mutationFn: async (body) => {
      const res = await adminCreateStockLocation(body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: stockLocationsQueryPrefix });
      toast.success('Stock location created');
      navigate(`/stock-locations/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create stock location');
    },
  });
}

export function useUpdateStockLocation(id: string) {
  const queryClient = useQueryClient();

  return useMutation<StockLocationDetail, SdkRequestError, UpdateStockLocationBody>({
    mutationFn: async (body) => {
      const res = await adminUpdateStockLocation(id, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockLocationsQueryPrefix });
      toast.success('Stock location saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save stock location');
    },
  });
}

export function useDeleteStockLocation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (id) => {
      await adminDeleteStockLocation(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockLocationsQueryPrefix });
      toast.success('Stock location deleted');
      navigate('/stock-locations');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete stock location');
    },
  });
}
