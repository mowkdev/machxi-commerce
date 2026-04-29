// Feature hooks compose SDK hooks directly with app-side concerns:
// envelope unwrap (`select: r => r.data`), toast, navigation, and cache
// invalidation. There is no per-feature `api.ts` indirection — the SDK is
// the API layer.
//
// Cache key convention: every tax-class query lives under the SDK's URL
// prefix `[{ url: '/api/tax-classes' }, ...]`. Invalidating that prefix
// catches list views, detail queries, and option pickers in one shot.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  SdkRequestError,
  adminCreateTaxClass,
  adminDeleteTaxClass,
  adminUpdateTaxClass,
  useAdminGetTaxClass,
  useAdminListTaxClasses,
} from '@repo/admin-sdk';
import type {
  CreateTaxClassBody,
  TaxClassDetail,
  TaxClassListItem,
  UpdateTaxClassBody,
} from '@repo/types/admin';

// Shared cache prefix — pages pass this to AppDataGrid so its internal
// useQuery shares a key prefix with SDK hooks; one invalidate clears all.
export const taxClassesQueryPrefix = [{ url: '/api/tax-classes' }] as const;

export function useTaxClass(id: string) {
  return useAdminGetTaxClass<TaxClassDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data,
    },
  });
}

export function useTaxClassOptions() {
  return useAdminListTaxClasses<TaxClassListItem[]>(
    { pageSize: 200 },
    {
      query: {
        staleTime: 5 * 60 * 1000,
        select: (response) => response.data,
      },
    }
  );
}

export function useCreateTaxClass() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, SdkRequestError, CreateTaxClassBody>({
    mutationFn: async (body) => {
      const res = await adminCreateTaxClass(body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taxClassesQueryPrefix });
      toast.success('Tax class created');
      navigate(`/tax-classes/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create tax class');
    },
  });
}

export function useUpdateTaxClass(id: string) {
  const queryClient = useQueryClient();

  return useMutation<TaxClassDetail, SdkRequestError, UpdateTaxClassBody>({
    mutationFn: async (body) => {
      const res = await adminUpdateTaxClass(id, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxClassesQueryPrefix });
      toast.success('Tax class saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save tax class');
    },
  });
}

export function useDeleteTaxClass() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (id) => {
      await adminDeleteTaxClass(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxClassesQueryPrefix });
      toast.success('Tax class deleted');
      navigate('/tax-classes');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete tax class');
    },
  });
}
