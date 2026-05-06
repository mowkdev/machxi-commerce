import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SdkRequestError,
  adminExpireCart,
  adminGetCartQueryKey,
  adminListCartsQueryKey,
  useAdminGetCart,
} from "@repo/admin-sdk";
import type { AdminCartDetail } from "@repo/types/admin";

export const cartsQueryPrefix = adminListCartsQueryKey();

export function useCart(id: string) {
  return useAdminGetCart<AdminCartDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data as AdminCartDetail,
    },
  });
}

export function useExpireCart(id: string) {
  const queryClient = useQueryClient();
  return useMutation<AdminCartDetail, SdkRequestError, void>({
    mutationFn: async () => {
      const res = await adminExpireCart(id);
      return res.data as AdminCartDetail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartsQueryPrefix });
      queryClient.invalidateQueries({ queryKey: adminGetCartQueryKey(id) });
      toast.success("Cart expired");
    },
    onError: (error) => toast.error(error.message || "Failed to expire cart"),
  });
}
