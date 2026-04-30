import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  SdkRequestError,
  adminCreateFulfillment,
  adminCreateFulfillmentItem,
  adminDeleteFulfillment,
  adminDeleteFulfillmentItem,
  adminGetFulfillmentQueryKey,
  adminListFulfillmentsQueryKey,
  adminUpdateFulfillment,
  adminUpdateFulfillmentItem,
  useAdminGetFulfillment,
} from "@repo/admin-sdk";
import type {
  CreateFulfillmentBody,
  CreateFulfillmentItemBody,
  FulfillmentDetail,
  UpdateFulfillmentBody,
  UpdateFulfillmentItemBody,
} from "@repo/types/admin";

export const fulfillmentsQueryPrefix = adminListFulfillmentsQueryKey();

function useInvalidateFulfillment(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: fulfillmentsQueryPrefix });
    queryClient.invalidateQueries({ queryKey: adminGetFulfillmentQueryKey(id) });
  };
}

export function useFulfillment(id: string) {
  return useAdminGetFulfillment<FulfillmentDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data as FulfillmentDetail,
    },
  });
}

export function useCreateFulfillment() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation<{ id: string }, SdkRequestError, CreateFulfillmentBody>({
    mutationFn: async (body) => (await adminCreateFulfillment(body)).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: fulfillmentsQueryPrefix });
      toast.success("Fulfillment created");
      navigate(`/fulfillments/${data.id}`);
    },
    onError: (error) =>
      toast.error(error.message || "Failed to create fulfillment"),
  });
}

export function useUpdateFulfillment(id: string) {
  const invalidateFulfillment = useInvalidateFulfillment(id);
  return useMutation<FulfillmentDetail, SdkRequestError, UpdateFulfillmentBody>({
    mutationFn: async (body) =>
      (await adminUpdateFulfillment(id, body)).data as FulfillmentDetail,
    onSuccess: () => {
      invalidateFulfillment();
      toast.success("Fulfillment saved");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to save fulfillment"),
  });
}

export function useDeleteFulfillment() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (id) => {
      await adminDeleteFulfillment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fulfillmentsQueryPrefix });
      toast.success("Fulfillment deleted");
      navigate("/fulfillments");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to delete fulfillment"),
  });
}

export function useCreateFulfillmentItem(fulfillmentId: string) {
  const invalidateFulfillment = useInvalidateFulfillment(fulfillmentId);
  return useMutation<void, SdkRequestError, CreateFulfillmentItemBody>({
    mutationFn: async (body) => {
      await adminCreateFulfillmentItem(fulfillmentId, body);
    },
    onSuccess: () => {
      invalidateFulfillment();
      toast.success("Fulfillment item added");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to add fulfillment item"),
  });
}

export function useUpdateFulfillmentItem(fulfillmentId: string) {
  const invalidateFulfillment = useInvalidateFulfillment(fulfillmentId);
  return useMutation<
    void,
    SdkRequestError,
    { orderItemId: string; body: UpdateFulfillmentItemBody }
  >({
    mutationFn: async ({ orderItemId, body }) => {
      await adminUpdateFulfillmentItem(fulfillmentId, orderItemId, body);
    },
    onSuccess: () => {
      invalidateFulfillment();
      toast.success("Fulfillment item saved");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to save fulfillment item"),
  });
}

export function useDeleteFulfillmentItem(fulfillmentId: string) {
  const invalidateFulfillment = useInvalidateFulfillment(fulfillmentId);
  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (orderItemId) => {
      await adminDeleteFulfillmentItem(fulfillmentId, orderItemId);
    },
    onSuccess: () => {
      invalidateFulfillment();
      toast.success("Fulfillment item deleted");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to delete fulfillment item"),
  });
}
