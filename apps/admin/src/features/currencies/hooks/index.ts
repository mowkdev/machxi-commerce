import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  SdkRequestError,
  adminCreateCurrency,
  adminGetCurrencyQueryKey,
  adminListCurrenciesQueryKey,
  adminUpdateCurrency,
  useAdminGetCurrency,
  useAdminListCurrencies,
} from "@repo/admin-sdk";
import type {
  CreateCurrencyBody,
  CurrencyDetail,
  CurrencyListItem,
  UpdateCurrencyBody,
} from "@repo/types/admin";

export const currenciesQueryPrefix = adminListCurrenciesQueryKey();

export function useCreateCurrency() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ code: string }, SdkRequestError, CreateCurrencyBody>({
    mutationFn: async (body) => {
      const res = await adminCreateCurrency(body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: currenciesQueryPrefix });
      toast.success("Currency created");
      navigate(`/settings/regions/currencies/${data.code}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create currency");
    },
  });
}

export function useCurrency(code: string) {
  return useAdminGetCurrency<CurrencyDetail>(code, {
    query: {
      enabled: !!code,
      select: (response) => response.data,
    },
  });
}

export function useCurrencyOptions() {
  return useAdminListCurrencies<CurrencyListItem[]>(
    { pageSize: 200, sortBy: "displayOrder", sortOrder: "asc" },
    {
      query: {
        staleTime: 5 * 60 * 1000,
        select: (response) => response.data,
      },
    },
  );
}

export function useUpdateCurrency(code: string) {
  const queryClient = useQueryClient();

  return useMutation<CurrencyDetail, SdkRequestError, UpdateCurrencyBody>({
    mutationFn: async (body) => {
      const res = await adminUpdateCurrency(code, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currenciesQueryPrefix });
      queryClient.invalidateQueries({
        queryKey: adminGetCurrencyQueryKey(code),
      });
      toast.success("Currency saved");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save currency");
    },
  });
}
