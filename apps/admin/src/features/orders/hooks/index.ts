import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api";
import {
  SdkRequestError,
  adminCreateOrder,
  adminCreateOrderItem,
  adminCreateOrderShippingLine,
  adminCreatePayment,
  adminDeleteOrder,
  adminDeleteOrderItem,
  adminDeleteOrderShippingLine,
  adminDeletePayment,
  adminDownloadInvoice,
  adminGetOrderQueryKey,
  adminListOrdersQueryKey,
  adminUpdateOrder,
  adminUpdateOrderItem,
  adminUpdateOrderShippingLine,
  adminUpdatePayment,
  useAdminGetOrder,
  useAdminGetInvoiceByOrder,
} from "@repo/admin-sdk";
import type {
  CreateOrderBody,
  OrderDetail,
  OrderItemInput,
  OrderShippingLineInput,
  PaymentInput,
  UpdateOrderBody,
  UpdateOrderItemBody,
  UpdateOrderShippingLineBody,
  UpdatePaymentBody,
} from "@repo/types/admin";

export const ordersQueryPrefix = adminListOrdersQueryKey();

function useInvalidateOrder(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ordersQueryPrefix });
    queryClient.invalidateQueries({ queryKey: adminGetOrderQueryKey(id) });
  };
}

export function useOrder(id: string) {
  return useAdminGetOrder<OrderDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data as OrderDetail,
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation<{ id: string }, SdkRequestError, CreateOrderBody>({
    mutationFn: async (body) => (await adminCreateOrder(body)).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryPrefix });
      toast.success("Order created");
      navigate(`/orders/${data.id}`);
    },
    onError: (error) => toast.error(error.message || "Failed to create order"),
  });
}

export function useUpdateOrder(id: string) {
  const invalidateOrder = useInvalidateOrder(id);
  return useMutation<OrderDetail, SdkRequestError, UpdateOrderBody>({
    mutationFn: async (body) =>
      (await adminUpdateOrder(id, body)).data as OrderDetail,
    onSuccess: () => {
      invalidateOrder();
      toast.success("Order saved");
    },
    onError: (error) => toast.error(error.message || "Failed to save order"),
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (id) => {
      await adminDeleteOrder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersQueryPrefix });
      toast.success("Order deleted");
      navigate("/orders");
    },
    onError: (error) => toast.error(error.message || "Failed to delete order"),
  });
}

export function useCreateOrderItem(orderId: string) {
  const invalidateOrder = useInvalidateOrder(orderId);
  return useMutation<void, SdkRequestError, OrderItemInput>({
    mutationFn: async (body) => {
      await adminCreateOrderItem(orderId, body);
    },
    onSuccess: () => {
      invalidateOrder();
      toast.success("Order item added");
    },
    onError: (error) => toast.error(error.message || "Failed to add order item"),
  });
}

export function useUpdateOrderItem(orderId: string) {
  const invalidateOrder = useInvalidateOrder(orderId);
  return useMutation<
    void,
    SdkRequestError,
    { itemId: string; body: UpdateOrderItemBody }
  >({
    mutationFn: async ({ itemId, body }) => {
      await adminUpdateOrderItem(orderId, itemId, body);
    },
    onSuccess: () => {
      invalidateOrder();
      toast.success("Order item saved");
    },
    onError: (error) => toast.error(error.message || "Failed to save order item"),
  });
}

export function useDeleteOrderItem(orderId: string) {
  const invalidateOrder = useInvalidateOrder(orderId);
  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (itemId) => {
      await adminDeleteOrderItem(orderId, itemId);
    },
    onSuccess: () => {
      invalidateOrder();
      toast.success("Order item deleted");
    },
    onError: (error) => toast.error(error.message || "Failed to delete order item"),
  });
}

export function useCreateOrderShippingLine(orderId: string) {
  const invalidateOrder = useInvalidateOrder(orderId);
  return useMutation<void, SdkRequestError, OrderShippingLineInput>({
    mutationFn: async (body) => {
      await adminCreateOrderShippingLine(orderId, body);
    },
    onSuccess: () => {
      invalidateOrder();
      toast.success("Shipping line added");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to add shipping line"),
  });
}

export function useUpdateOrderShippingLine(orderId: string) {
  const invalidateOrder = useInvalidateOrder(orderId);
  return useMutation<
    void,
    SdkRequestError,
    { shippingLineId: string; body: UpdateOrderShippingLineBody }
  >({
    mutationFn: async ({ shippingLineId, body }) => {
      await adminUpdateOrderShippingLine(orderId, shippingLineId, body);
    },
    onSuccess: () => {
      invalidateOrder();
      toast.success("Shipping line saved");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to save shipping line"),
  });
}

export function useDeleteOrderShippingLine(orderId: string) {
  const invalidateOrder = useInvalidateOrder(orderId);
  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (shippingLineId) => {
      await adminDeleteOrderShippingLine(orderId, shippingLineId);
    },
    onSuccess: () => {
      invalidateOrder();
      toast.success("Shipping line deleted");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to delete shipping line"),
  });
}

export function useCreatePayment(orderId: string) {
  const invalidateOrder = useInvalidateOrder(orderId);
  return useMutation<void, SdkRequestError, PaymentInput>({
    mutationFn: async (body) => {
      await adminCreatePayment(orderId, body);
    },
    onSuccess: () => {
      invalidateOrder();
      toast.success("Payment added");
    },
    onError: (error) => toast.error(error.message || "Failed to add payment"),
  });
}

export function useUpdatePayment(orderId: string) {
  const invalidateOrder = useInvalidateOrder(orderId);
  return useMutation<
    void,
    SdkRequestError,
    { paymentId: string; body: UpdatePaymentBody }
  >({
    mutationFn: async ({ paymentId, body }) => {
      await adminUpdatePayment(orderId, paymentId, body);
    },
    onSuccess: () => {
      invalidateOrder();
      toast.success("Payment saved");
    },
    onError: (error) => toast.error(error.message || "Failed to save payment"),
  });
}

export function useDeletePayment(orderId: string) {
  const invalidateOrder = useInvalidateOrder(orderId);
  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (paymentId) => {
      await adminDeletePayment(orderId, paymentId);
    },
    onSuccess: () => {
      invalidateOrder();
      toast.success("Payment deleted");
    },
    onError: (error) => toast.error(error.message || "Failed to delete payment"),
  });
}

export function useOrderInvoice(orderId: string) {
  return useAdminGetInvoiceByOrder(orderId, {
    query: {
      enabled: !!orderId,
      retry: false,
    },
  });
}

export function useDownloadInvoice() {
  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (invoiceId) => {
      const res = await adminDownloadInvoice(invoiceId);
      const url = (res.data as { downloadUrl: string }).downloadUrl;
      window.open(url, "_blank");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to download invoice"),
  });
}

export function useMarkOrderPaid(orderId: string) {
  const invalidateOrder = useInvalidateOrder(orderId);
  return useMutation<OrderDetail, ApiRequestError, void>({
    mutationFn: async () => {
      const res = await api.post<OrderDetail>(`/api/orders/${orderId}/mark-paid`);
      return res.data;
    },
    onSuccess: () => {
      invalidateOrder();
      toast.success("Order marked as paid");
    },
    onError: (error) => toast.error(error.message || "Failed to mark order as paid"),
  });
}

export function useCancelOrder(orderId: string) {
  const invalidateOrder = useInvalidateOrder(orderId);
  return useMutation<OrderDetail, ApiRequestError, void>({
    mutationFn: async () => {
      const res = await api.post<OrderDetail>(`/api/orders/${orderId}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      invalidateOrder();
      toast.success("Order canceled");
    },
    onError: (error) => toast.error(error.message || "Failed to cancel order"),
  });
}
