import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiRequestError } from '@/lib/api';
import type {
  CreateTaxClassBody,
  UpdateTaxClassBody,
  TaxClassDetail,
} from '@repo/types/admin';
import {
  getTaxClass,
  createTaxClass,
  updateTaxClass,
  deleteTaxClass,
  listAllTaxClasses,
  taxClassesKeys,
  type TaxClassListItem,
} from './api';

export function useTaxClass(id: string) {
  return useQuery<TaxClassDetail, ApiRequestError>({
    queryKey: taxClassesKeys.detail(id),
    queryFn: () => getTaxClass(id),
  });
}

export function useCreateTaxClass() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, ApiRequestError, CreateTaxClassBody>({
    mutationFn: createTaxClass,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taxClassesKeys.list() });
      queryClient.invalidateQueries({ queryKey: taxClassesKeys.options() });
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

  return useMutation<TaxClassDetail, ApiRequestError, UpdateTaxClassBody>({
    mutationFn: (body) => updateTaxClass(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(taxClassesKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: taxClassesKeys.list() });
      queryClient.invalidateQueries({ queryKey: taxClassesKeys.options() });
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

  return useMutation<void, ApiRequestError, string>({
    mutationFn: deleteTaxClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxClassesKeys.list() });
      queryClient.invalidateQueries({ queryKey: taxClassesKeys.options() });
      toast.success('Tax class deleted');
      navigate('/tax-classes');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete tax class');
    },
  });
}

export function useTaxClassOptions() {
  return useQuery<TaxClassListItem[], ApiRequestError>({
    queryKey: taxClassesKeys.options(),
    queryFn: listAllTaxClasses,
    staleTime: 5 * 60 * 1000,
  });
}
