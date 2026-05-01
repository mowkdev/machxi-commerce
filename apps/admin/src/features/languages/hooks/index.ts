import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  SdkRequestError,
  adminCreateLanguage,
  adminDeleteLanguage,
  adminGetLanguageQueryKey,
  adminListLanguagesQueryKey,
  adminUpdateLanguage,
  useAdminGetLanguage,
  useAdminListLanguages,
} from "@repo/admin-sdk";
import type {
  CreateLanguageBody,
  LanguageDetail,
  LanguageListItem,
  UpdateLanguageBody,
} from "@repo/types/admin";

export const languagesQueryPrefix = adminListLanguagesQueryKey();

export function useLanguage(code: string) {
  return useAdminGetLanguage<LanguageDetail>(code, {
    query: {
      enabled: !!code,
      select: (response) => response.data,
    },
  });
}

export function useLanguageOptions() {
  return useAdminListLanguages<LanguageListItem[]>(
    { pageSize: 200, sortBy: "name", sortOrder: "asc" },
    {
      query: {
        staleTime: 5 * 60 * 1000,
        select: (response) => response.data,
      },
    },
  );
}

export function useCreateLanguage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ code: string }, SdkRequestError, CreateLanguageBody>({
    mutationFn: async (body) => {
      const res = await adminCreateLanguage(body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: languagesQueryPrefix });
      toast.success("Language created");
      navigate(`/settings/regions/languages/${data.code}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create language");
    },
  });
}

export function useUpdateLanguage(code: string) {
  const queryClient = useQueryClient();

  return useMutation<LanguageDetail, SdkRequestError, UpdateLanguageBody>({
    mutationFn: async (body) => {
      const res = await adminUpdateLanguage(code, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: languagesQueryPrefix });
      queryClient.invalidateQueries({
        queryKey: adminGetLanguageQueryKey(code),
      });
      toast.success("Language saved");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save language");
    },
  });
}

export function useDeleteLanguage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (code) => {
      await adminDeleteLanguage(code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: languagesQueryPrefix });
      toast.success("Language deleted");
      navigate("/settings/regions/languages");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete language");
    },
  });
}
