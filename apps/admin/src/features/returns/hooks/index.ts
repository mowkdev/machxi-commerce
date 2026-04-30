import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  SdkRequestError,
  adminCreateReturn,
  adminCreateReturnItem,
  adminDeleteReturn,
  adminDeleteReturnItem,
  adminGetReturnQueryKey,
  adminListReturnsQueryKey,
  adminUpdateReturn,
  adminUpdateReturnItem,
  useAdminGetReturn,
} from "@repo/admin-sdk";
import type {
  CreateReturnBody,
  CreateReturnItemBody,
  ReturnDetail,
  UpdateReturnBody,
  UpdateReturnItemBody,
} from "@repo/types/admin";

export const returnsQueryPrefix = adminListReturnsQueryKey();

function useInvalidateReturn(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: returnsQueryPrefix });
    queryClient.invalidateQueries({ queryKey: adminGetReturnQueryKey(id) });
  };
}

export function useReturn(id: string) {
  return useAdminGetReturn<ReturnDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data as ReturnDetail,
    },
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation<{ id: string }, SdkRequestError, CreateReturnBody>({
    mutationFn: async (body) => (await adminCreateReturn(body)).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: returnsQueryPrefix });
      toast.success("Return created");
      navigate(`/returns/${data.id}`);
    },
    onError: (error) => toast.error(error.message || "Failed to create return"),
  });
}

export function useUpdateReturn(id: string) {
  const invalidateReturn = useInvalidateReturn(id);
  return useMutation<ReturnDetail, SdkRequestError, UpdateReturnBody>({
    mutationFn: async (body) =>
      (await adminUpdateReturn(id, body)).data as ReturnDetail,
    onSuccess: () => {
      invalidateReturn();
      toast.success("Return saved");
    },
    onError: (error) => toast.error(error.message || "Failed to save return"),
  });
}

export function useDeleteReturn() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (id) => {
      await adminDeleteReturn(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: returnsQueryPrefix });
      toast.success("Return deleted");
      navigate("/returns");
    },
    onError: (error) => toast.error(error.message || "Failed to delete return"),
  });
}

export function useCreateReturnItem(returnId: string) {
  const invalidateReturn = useInvalidateReturn(returnId);
  return useMutation<void, SdkRequestError, CreateReturnItemBody>({
    mutationFn: async (body) => {
      await adminCreateReturnItem(returnId, body);
    },
    onSuccess: () => {
      invalidateReturn();
      toast.success("Return item added");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to add return item"),
  });
}

export function useUpdateReturnItem(returnId: string) {
  const invalidateReturn = useInvalidateReturn(returnId);
  return useMutation<
    void,
    SdkRequestError,
    { itemId: string; body: UpdateReturnItemBody }
  >({
    mutationFn: async ({ itemId, body }) => {
      await adminUpdateReturnItem(returnId, itemId, body);
    },
    onSuccess: () => {
      invalidateReturn();
      toast.success("Return item saved");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to save return item"),
  });
}

export function useDeleteReturnItem(returnId: string) {
  const invalidateReturn = useInvalidateReturn(returnId);
  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (itemId) => {
      await adminDeleteReturnItem(returnId, itemId);
    },
    onSuccess: () => {
      invalidateReturn();
      toast.success("Return item deleted");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to delete return item"),
  });
}
