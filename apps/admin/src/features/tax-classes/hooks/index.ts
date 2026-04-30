import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  SdkRequestError,
  adminCreateTaxClass,
  adminCreateTaxRate,
  adminDeleteTaxClass,
  adminDeleteTaxRate,
  adminGetTaxClassQueryKey,
  adminListTaxClassesQueryKey,
  adminListTaxRatesQueryKey,
  adminUpdateTaxClass,
  adminUpdateTaxRate,
  useAdminGetTaxClass,
  useAdminListTaxClasses,
  useAdminListTaxRates,
} from '@repo/admin-sdk';
import type {
  CreateTaxRateBody,
  CreateTaxClassBody,
  TaxClassDetail,
  TaxClassListItem,
  TaxRateDetail,
  UpdateTaxRateBody,
  UpdateTaxClassBody,
} from '@repo/types/admin';

// Query hooks compose generated SDK hooks directly. Mutation hooks wrap raw SDK
// clients so app concerns stay local: toast, navigation, and cache invalidation.
export const taxClassesQueryPrefix = adminListTaxClassesQueryKey();

function useInvalidateTaxClassRates(taxClassId: string) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: taxClassesQueryPrefix });
    queryClient.invalidateQueries({ queryKey: adminGetTaxClassQueryKey(taxClassId) });
    queryClient.invalidateQueries({ queryKey: adminListTaxRatesQueryKey(taxClassId) });
  };
}

export function useTaxClass(id: string) {
  return useAdminGetTaxClass<TaxClassDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data,
    },
  });
}

export function useTaxRates(taxClassId: string) {
  return useAdminListTaxRates<TaxRateDetail[]>(taxClassId, {
    query: {
      enabled: !!taxClassId,
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
      queryClient.invalidateQueries({ queryKey: adminGetTaxClassQueryKey(id) });
      toast.success('Tax class saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save tax class');
    },
  });
}

export function useCreateTaxRate(taxClassId: string) {
  const invalidateTaxClassRates = useInvalidateTaxClassRates(taxClassId);

  return useMutation<TaxRateDetail, SdkRequestError, CreateTaxRateBody>({
    mutationFn: async (body) => {
      const res = await adminCreateTaxRate(taxClassId, body);
      return res.data;
    },
    onSuccess: () => {
      invalidateTaxClassRates();
      toast.success('Tax rate added');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add tax rate');
    },
  });
}

export function useUpdateTaxRate(taxClassId: string) {
  const invalidateTaxClassRates = useInvalidateTaxClassRates(taxClassId);

  return useMutation<
    TaxRateDetail,
    SdkRequestError,
    { rateId: string; body: UpdateTaxRateBody }
  >({
    mutationFn: async ({ rateId, body }) => {
      const res = await adminUpdateTaxRate(taxClassId, rateId, body);
      return res.data;
    },
    onSuccess: () => {
      invalidateTaxClassRates();
      toast.success('Tax rate saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save tax rate');
    },
  });
}

export function useDeleteTaxRate(taxClassId: string) {
  const invalidateTaxClassRates = useInvalidateTaxClassRates(taxClassId);

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (rateId) => {
      await adminDeleteTaxRate(taxClassId, rateId);
    },
    onSuccess: () => {
      invalidateTaxClassRates();
      toast.success('Tax rate deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete tax rate');
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
