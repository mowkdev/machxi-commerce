import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import {
  SdkRequestError,
  adminCreatePaymentProvider,
  adminDeletePaymentProvider,
  adminGetPaymentProviderQueryKey,
  adminListPaymentProvidersQueryKey,
  adminUpdatePaymentProvider,
} from "@repo/admin-sdk";
import type { PaymentProviderDetail } from "@repo/types/admin";

export const paymentProvidersListQueryPrefix =
  adminListPaymentProvidersQueryKey();

export const providerCodeEnum = z.enum(["manual_invoice", "stripe"]);

const createFormSchema = z.object({
  code: providerCodeEnum,
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  kind: z.enum(["automatic", "manual"]),
  isEnabled: z.boolean(),
  displayOrder: z.number().int(),
  configJson: z.string().optional(),
});

const editFormSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  kind: z.enum(["automatic", "manual"]),
  isEnabled: z.boolean(),
  displayOrder: z.number().int(),
});

export type PaymentProviderCreateFormValues = z.infer<typeof createFormSchema>;

function parseConfigJson(s: string | undefined): Record<string, unknown> {
  if (!s?.trim()) return {};
  const parsed: unknown = JSON.parse(s);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  throw new Error("Config must be a JSON object");
}

function useCreatePaymentProviderForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: adminCreatePaymentProvider,
    onSuccess: async (res) => {
      toast.success("Payment provider created");
      await qc.invalidateQueries({ queryKey: paymentProvidersListQueryPrefix });
      navigate(`/settings/payments/providers/${res.data.id}`);
    },
    onError: (e: Error) => {
      const msg =
        e instanceof SdkRequestError ? e.message : (e.message ?? "Failed");
      toast.error(msg);
    },
  });

  const form = useForm({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      code: "manual_invoice" as z.infer<typeof providerCodeEnum>,
      name: "",
      description: "",
      kind: "manual" as const,
      isEnabled: false,
      displayOrder: 0,
      configJson: "{}",
    },
  });

  return {
    form,
    createMutation: mutation,
    onSubmit: form.handleSubmit((vals) => {
      try {
        const config = parseConfigJson(vals.configJson);
        mutation.mutate({
          code: vals.code,
          name: vals.name,
          description: vals.description || undefined,
          kind: vals.kind,
          isEnabled: vals.isEnabled,
          displayOrder: vals.displayOrder,
          config,
        });
      } catch {
        toast.error("Invalid JSON for config");
      }
    }),
  };
}

function useEditPaymentProviderForm(initial: PaymentProviderDetail) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof editFormSchema>) =>
      adminUpdatePaymentProvider(initial.id, {
        name: data.name,
        description:
          data.description === "" || data.description === undefined
            ? null
            : data.description,
        kind: data.kind,
        isEnabled: data.isEnabled,
        displayOrder: data.displayOrder,
      }),
    onSuccess: async () => {
      toast.success("Payment provider saved");
      await qc.invalidateQueries({ queryKey: paymentProvidersListQueryPrefix });
      await qc.invalidateQueries({
        queryKey: adminGetPaymentProviderQueryKey(initial.id),
      });
    },
    onError: (e: Error) => {
      const msg =
        e instanceof SdkRequestError ? e.message : (e.message ?? "Failed");
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminDeletePaymentProvider(initial.id),
    onSuccess: async () => {
      toast.success("Payment provider deleted");
      await qc.invalidateQueries({ queryKey: paymentProvidersListQueryPrefix });
      navigate("/settings/payments/providers");
    },
    onError: (e: Error) => {
      const msg =
        e instanceof SdkRequestError ? e.message : (e.message ?? "Failed");
      toast.error(msg);
    },
  });

  const configMutation = useMutation({
    mutationFn: (config: Record<string, unknown>) =>
      adminUpdatePaymentProvider(initial.id, {
        config,
      }),
    onSuccess: async () => {
      toast.success("Config saved");
      await qc.invalidateQueries({ queryKey: paymentProvidersListQueryPrefix });
      await qc.invalidateQueries({
        queryKey: adminGetPaymentProviderQueryKey(initial.id),
      });
    },
    onError: (e: Error) => {
      const msg =
        e instanceof SdkRequestError ? e.message : (e.message ?? "Failed");
      toast.error(msg);
    },
  });

  const form = useForm({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: initial.name,
      description: initial.description ?? "",
      kind: initial.kind,
      isEnabled: initial.isEnabled,
      displayOrder: initial.displayOrder,
    },
  });

  const [configJson, setConfigJson] = React.useState(() =>
    JSON.stringify(initial.config ?? {}, null, 2),
  );

  React.useEffect(() => {
    form.reset({
      name: initial.name,
      description: initial.description ?? "",
      kind: initial.kind,
      isEnabled: initial.isEnabled,
      displayOrder: initial.displayOrder,
    });
    setConfigJson(JSON.stringify(initial.config ?? {}, null, 2));
  }, [initial.id, initial.updatedAt, form, initial]);

  return {
    form,
    updateMutation: mutation,
    deleteMutation,
    configMutation,
    configJson,
    setConfigJson,
    navigateBack: () => navigate("/settings/payments/providers"),
    onSubmit: form.handleSubmit((vals) => mutation.mutate(vals)),
    onSaveConfig: () => {
      try {
        configMutation.mutate(parseConfigJson(configJson));
      } catch {
        toast.error("Invalid JSON for config");
      }
    },
    initial,
  };
}

export function usePaymentProviderForm(opts: {
  mode: "create" | "edit";
  initial?: PaymentProviderDetail;
}) {
  if (opts.mode === "create") {
    return { mode: "create" as const, ...useCreatePaymentProviderForm() };
  }
  if (!opts.initial) {
    throw new Error("initial required for edit mode");
  }
  return { mode: "edit" as const, ...useEditPaymentProviderForm(opts.initial) };
}
