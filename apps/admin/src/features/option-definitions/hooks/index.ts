import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  SdkRequestError,
  adminCreateOptionDefinition,
  adminCreateOptionValue,
  adminGetOptionDefinitionQueryKey,
  adminListOptionDefinitionsCatalogQueryKey,
  adminUpdateOptionDefinition,
  adminUpdateOptionValue,
  useAdminGetOptionDefinition,
} from '@repo/admin-sdk';
import type {
  CreateOptionDefinitionBody,
  CreateOptionValueBody,
  OptionDefinitionDetail,
  UpdateOptionDefinitionBody,
  UpdateOptionValueBody,
} from '@repo/types/admin';

export const optionDefinitionsQueryPrefix = adminListOptionDefinitionsCatalogQueryKey();

export function useOptionDefinition(id: string) {
  return useAdminGetOptionDefinition<OptionDefinitionDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data,
    },
  });
}

export function useCreateOptionDefinition() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, SdkRequestError, CreateOptionDefinitionBody>({
    mutationFn: async (body) => {
      const res = await adminCreateOptionDefinition(body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: optionDefinitionsQueryPrefix });
      toast.success('Option created');
      navigate(`/options/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create option');
    },
  });
}

export function useUpdateOptionDefinition(id: string) {
  const queryClient = useQueryClient();

  return useMutation<OptionDefinitionDetail, SdkRequestError, UpdateOptionDefinitionBody>({
    mutationFn: async (body) => {
      const res = await adminUpdateOptionDefinition(id, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: optionDefinitionsQueryPrefix });
      queryClient.invalidateQueries({ queryKey: adminGetOptionDefinitionQueryKey(id) });
      toast.success('Option saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save option');
    },
  });
}

export function useCreateOptionValue(optionId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ id: string }, SdkRequestError, CreateOptionValueBody>({
    mutationFn: async (body) => {
      const res = await adminCreateOptionValue(optionId, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminGetOptionDefinitionQueryKey(optionId) });
      queryClient.invalidateQueries({ queryKey: optionDefinitionsQueryPrefix });
      toast.success('Value created');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create value');
    },
  });
}

export function useUpdateOptionValue(optionId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    OptionDefinitionDetail,
    SdkRequestError,
    { valueId: string; body: UpdateOptionValueBody }
  >({
    mutationFn: async ({ valueId, body }) => {
      const res = await adminUpdateOptionValue(optionId, valueId, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminGetOptionDefinitionQueryKey(optionId) });
      queryClient.invalidateQueries({ queryKey: optionDefinitionsQueryPrefix });
      toast.success('Value saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save value');
    },
  });
}
