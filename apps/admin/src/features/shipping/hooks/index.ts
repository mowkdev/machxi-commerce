import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { PaginationMeta } from "@repo/types";
import type {
  CreateShippingOptionBody,
  CreateShippingZoneBody,
  ShippingOptionDetail,
  ShippingOptionListItem,
  ShippingZoneDetail,
  ShippingZoneListItem,
  UpdateShippingOptionBody,
  UpdateShippingZoneBody,
} from "@repo/types/admin";

interface ListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ShippingListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  countryCode?: string;
  taxClassId?: string;
  zoneId?: string;
}

export const shippingZonesQueryPrefix = ["shipping-zones"] as const;
export const shippingOptionsQueryPrefix = ["shipping-options"] as const;

export async function listShippingZones(params: ShippingListParams = {}) {
  const res = await api.get<ListResponse<ShippingZoneListItem>>(
    "/api/shipping/zones",
    {
      params,
    },
  );
  return res.data;
}

export async function listShippingOptions(params: ShippingListParams = {}) {
  const res = await api.get<ListResponse<ShippingOptionListItem>>(
    "/api/shipping/options",
    {
      params,
    },
  );
  return res.data;
}

export function useShippingZone(id: string) {
  return useQuery({
    queryKey: [...shippingZonesQueryPrefix, id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<ShippingZoneDetail>(
        `/api/shipping/zones/${id}`,
      );
      return res.data;
    },
  });
}

export function useShippingZonesOptions() {
  return useQuery({
    queryKey: [...shippingZonesQueryPrefix, "options"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const result = await listShippingZones({
        pageSize: 200,
        sortBy: "name",
        sortOrder: "asc",
      });
      return result.data;
    },
  });
}

export function useShippingOption(id: string) {
  return useQuery({
    queryKey: [...shippingOptionsQueryPrefix, id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<ShippingOptionDetail>(
        `/api/shipping/options/${id}`,
      );
      return res.data;
    },
  });
}

export function useCreateShippingZone() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, Error, CreateShippingZoneBody>({
    mutationFn: async (body) => {
      const res = await api.post<{ id: string }>("/api/shipping/zones", body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: shippingZonesQueryPrefix });
      toast.success("Shipping zone created");
      navigate(`/shipping-zones/${data.id}`);
    },
    onError: (error) =>
      toast.error(error.message || "Failed to create shipping zone"),
  });
}

export function useUpdateShippingZone(id: string) {
  const queryClient = useQueryClient();

  return useMutation<ShippingZoneDetail, Error, UpdateShippingZoneBody>({
    mutationFn: async (body) => {
      const res = await api.put<ShippingZoneDetail>(
        `/api/shipping/zones/${id}`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shippingZonesQueryPrefix });
      queryClient.invalidateQueries({
        queryKey: [...shippingZonesQueryPrefix, id],
      });
      toast.success("Shipping zone saved");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to save shipping zone"),
  });
}

export function useDeleteShippingZone() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/api/shipping/zones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shippingZonesQueryPrefix });
      queryClient.invalidateQueries({ queryKey: shippingOptionsQueryPrefix });
      toast.success("Shipping zone deleted");
      navigate("/shipping-zones");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to delete shipping zone"),
  });
}

export function useCreateShippingOption() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, Error, CreateShippingOptionBody>({
    mutationFn: async (body) => {
      const res = await api.post<{ id: string }>("/api/shipping/options", body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: shippingOptionsQueryPrefix });
      toast.success("Shipping option created");
      navigate(`/shipping-options/${data.id}`);
    },
    onError: (error) =>
      toast.error(error.message || "Failed to create shipping option"),
  });
}

export function useUpdateShippingOption(id: string) {
  const queryClient = useQueryClient();

  return useMutation<ShippingOptionDetail, Error, UpdateShippingOptionBody>({
    mutationFn: async (body) => {
      const res = await api.put<ShippingOptionDetail>(
        `/api/shipping/options/${id}`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shippingOptionsQueryPrefix });
      queryClient.invalidateQueries({
        queryKey: [...shippingOptionsQueryPrefix, id],
      });
      toast.success("Shipping option saved");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to save shipping option"),
  });
}

export function useDeleteShippingOption() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/api/shipping/options/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shippingOptionsQueryPrefix });
      toast.success("Shipping option deleted");
      navigate("/shipping-options");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to delete shipping option"),
  });
}
