import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import type { CurrencyDetail, UpdateCurrencyBody } from "@repo/types/admin";
import { useCreateCurrency, useUpdateCurrency } from "../hooks";
import { currencyFormSchema, type CurrencyFormValues } from "../schema";

interface UseCurrencyFormParams {
  mode: "create" | "edit";
  initialData?: CurrencyDetail;
}

export function useCurrencyForm({ mode, initialData }: UseCurrencyFormParams) {
  const navigate = useNavigate();
  const createMutation = useCreateCurrency();
  const updateMutation = useUpdateCurrency(initialData?.code ?? "");
  const isCreateMode = mode === "create";
  const isEditMode = mode === "edit";

  const defaultValues = useMemo<CurrencyFormValues>(() => {
    if (isCreateMode) {
      return {
        code: "",
        name: "",
        symbol: "",
        decimalDigits: 2,
        displayOrder: 100,
        isActive: true,
        isDefault: false,
      };
    }
    return {
      code: initialData!.code,
      name: initialData!.name,
      symbol: initialData!.symbol,
      decimalDigits: initialData!.decimalDigits,
      displayOrder: initialData!.displayOrder,
      isActive: initialData!.isActive,
      isDefault: initialData!.isDefault,
    };
  }, [initialData, isCreateMode]);

  const form = useForm<CurrencyFormValues, unknown, CurrencyFormValues>({
    resolver: zodResolver(currencyFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, initialData, isEditMode]);

  const onSubmit = form.handleSubmit((values) => {
    if (isCreateMode) {
      createMutation.mutate({
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        symbol: values.symbol.trim(),
        decimalDigits: values.decimalDigits,
        isActive: values.isActive ?? true,
        isDefault: values.isDefault ?? false,
        displayOrder: values.displayOrder,
      });
      return;
    }

    if (!initialData) return;

    const body: UpdateCurrencyBody = {};
    if (values.isActive !== initialData.isActive) {
      body.isActive = values.isActive ?? false;
    }
    if (values.isDefault !== initialData.isDefault) {
      body.isDefault = values.isDefault ?? false;
    }
    if (values.displayOrder !== initialData.displayOrder) {
      body.displayOrder = values.displayOrder;
    }

    if (
      body.isActive === undefined &&
      body.isDefault === undefined &&
      body.displayOrder === undefined
    ) {
      return;
    }

    updateMutation.mutate(body);
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const title = isCreateMode
    ? "New currency"
    : `${initialData!.code} — ${initialData!.name}`;
  const navigateToCurrencies = () => navigate("/settings/regions/currencies");

  return {
    form,
    isCreateMode,
    isEditMode,
    isPending,
    navigateToCurrencies,
    onSubmit,
    title,
  };
}
