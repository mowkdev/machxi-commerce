import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  SdkRequestError,
  adminCreateCustomer,
  adminCreateCustomerAddress,
  adminDeleteCustomer,
  adminDeleteCustomerAddress,
  adminGetCustomerQueryKey,
  adminListCustomersQueryKey,
  adminUpdateCustomer,
  adminUpdateCustomerAddress,
  useAdminGetCustomer,
} from "@repo/admin-sdk";
import type {
  CreateCustomerAddressBody,
  CreateCustomerBody,
  CustomerAddress,
  CustomerDetail,
  UpdateCustomerAddressBody,
  UpdateCustomerBody,
} from "@repo/types/admin";

export const customersQueryPrefix = adminListCustomersQueryKey();

function useInvalidateCustomer(id: string) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: customersQueryPrefix });
    queryClient.invalidateQueries({ queryKey: adminGetCustomerQueryKey(id) });
  };
}

export function useCustomer(id: string) {
  return useAdminGetCustomer<CustomerDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data,
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, SdkRequestError, CreateCustomerBody>({
    mutationFn: async (body) => {
      const res = await adminCreateCustomer(body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customersQueryPrefix });
      toast.success("Customer created");
      navigate(`/customers/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create customer");
    },
  });
}

export function useUpdateCustomer(id: string) {
  const invalidateCustomer = useInvalidateCustomer(id);

  return useMutation<CustomerDetail, SdkRequestError, UpdateCustomerBody>({
    mutationFn: async (body) => {
      const res = await adminUpdateCustomer(id, body);
      return res.data;
    },
    onSuccess: () => {
      invalidateCustomer();
      toast.success("Customer saved");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save customer");
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (id) => {
      await adminDeleteCustomer(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersQueryPrefix });
      toast.success("Customer deleted");
      navigate("/customers");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete customer");
    },
  });
}

export function useCreateCustomerAddress(customerId: string) {
  const invalidateCustomer = useInvalidateCustomer(customerId);

  return useMutation<
    CustomerAddress,
    SdkRequestError,
    CreateCustomerAddressBody
  >({
    mutationFn: async (body) => {
      const res = await adminCreateCustomerAddress(customerId, body);
      return res.data;
    },
    onSuccess: () => {
      invalidateCustomer();
      toast.success("Address added");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add address");
    },
  });
}

export function useUpdateCustomerAddress(customerId: string) {
  const invalidateCustomer = useInvalidateCustomer(customerId);

  return useMutation<
    CustomerAddress,
    SdkRequestError,
    { addressId: string; body: UpdateCustomerAddressBody }
  >({
    mutationFn: async ({ addressId, body }) => {
      const res = await adminUpdateCustomerAddress(customerId, addressId, body);
      return res.data;
    },
    onSuccess: () => {
      invalidateCustomer();
      toast.success("Address saved");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save address");
    },
  });
}

export function useDeleteCustomerAddress(customerId: string) {
  const invalidateCustomer = useInvalidateCustomer(customerId);

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (addressId) => {
      await adminDeleteCustomerAddress(customerId, addressId);
    },
    onSuccess: () => {
      invalidateCustomer();
      toast.success("Address deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete address");
    },
  });
}
