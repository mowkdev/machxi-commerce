import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import type { LanguageDetail } from "@repo/types/admin";
import { useCreateLanguage, useUpdateLanguage } from "../hooks";
import { languageFormSchema, type LanguageFormValues } from "../schema";

interface UseLanguageFormParams {
  mode: "create" | "edit";
  initialData?: LanguageDetail;
}

export function useLanguageForm({ mode, initialData }: UseLanguageFormParams) {
  const navigate = useNavigate();
  const createMutation = useCreateLanguage();
  const updateMutation = useUpdateLanguage(initialData?.code ?? "");
  const isCreateMode = mode === "create";
  const isEditMode = mode === "edit";

  const defaultValues = useMemo<LanguageFormValues>(
    () => ({
      code: initialData?.code ?? "",
      name: initialData?.name ?? "",
      isDefault: initialData?.isDefault ?? false,
    }),
    [initialData],
  );

  const form = useForm<LanguageFormValues, unknown, LanguageFormValues>({
    resolver: zodResolver(languageFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset(defaultValues);
    }
  }, [initialData, isEditMode, form, defaultValues]);

  const onSubmit = form.handleSubmit((values) => {
    const body = {
      name: values.name,
      isDefault: values.isDefault,
    };

    if (isCreateMode) {
      createMutation.mutate({
        code: values.code,
        name: values.name,
        isDefault: values.isDefault ?? false,
      });
    } else {
      updateMutation.mutate({
        name: values.name,
        ...(values.isDefault !== undefined
          ? { isDefault: values.isDefault }
          : {}),
      });
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const title = isCreateMode
    ? "New language"
    : form.watch("name") || initialData?.code || "Untitled";
  const navigateToLanguages = () => navigate("/settings/regions/languages");

  return {
    form,
    isCreateMode,
    isEditMode,
    isPending,
    navigateToLanguages,
    onSubmit,
    title,
  };
}
