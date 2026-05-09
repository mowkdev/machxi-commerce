import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  SdkRequestError,
  adminUpdateStoreSettings,
  adminGetStoreSettingsQueryKey,
  useAdminGetStoreSettings,
} from "@repo/admin-sdk";

const formSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
  addressStreet: z.string().trim().optional(),
  addressCity: z.string().trim().optional(),
  addressZip: z.string().trim().optional(),
  addressCountry: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[A-Z]{2}$/.test(v), {
      message: "Must be a 2-letter country code (e.g. DE, US)",
    }),
  taxId: z.string().trim().optional(),
  vatNumber: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  iban: z.string().trim().optional(),
  bic: z.string().trim().optional(),
  accountHolder: z.string().trim().optional(),
  logoUrl: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  invoicePrefix: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[A-Z0-9-]+$/.test(v), {
      message: "Only uppercase letters, numbers, and hyphens allowed",
    }),
  invoiceFooterText: z.string().trim().optional(),
});

export type StoreSettingsFormValues = z.infer<typeof formSchema>;

const DEFAULTS: StoreSettingsFormValues = {
  companyName: "",
  addressStreet: "",
  addressCity: "",
  addressZip: "",
  addressCountry: "",
  taxId: "",
  vatNumber: "",
  bankName: "",
  iban: "",
  bic: "",
  accountHolder: "",
  logoUrl: "",
  invoicePrefix: "INV",
  invoiceFooterText: "",
};

export function useStoreSettingsForm() {
  const qc = useQueryClient();
  const { data: response, isLoading } = useAdminGetStoreSettings();
  const settings = response?.data ?? null;

  const form = useForm<StoreSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULTS,
  });

  // Reset form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        companyName: settings.companyName ?? "",
        addressStreet: settings.addressStreet ?? "",
        addressCity: settings.addressCity ?? "",
        addressZip: settings.addressZip ?? "",
        addressCountry: settings.addressCountry ?? "",
        taxId: settings.taxId ?? "",
        vatNumber: settings.vatNumber ?? "",
        bankName: settings.bankName ?? "",
        iban: settings.iban ?? "",
        bic: settings.bic ?? "",
        accountHolder: settings.accountHolder ?? "",
        logoUrl: settings.logoUrl ?? "",
        invoicePrefix: settings.invoicePrefix ?? "INV",
        invoiceFooterText: settings.invoiceFooterText ?? "",
      });
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: (data: StoreSettingsFormValues) =>
      adminUpdateStoreSettings({
        companyName: data.companyName,
        addressStreet: data.addressStreet || undefined,
        addressCity: data.addressCity || undefined,
        addressZip: data.addressZip || undefined,
        addressCountry: data.addressCountry || undefined,
        taxId: data.taxId || undefined,
        vatNumber: data.vatNumber || undefined,
        bankName: data.bankName || undefined,
        iban: data.iban || undefined,
        bic: data.bic || undefined,
        accountHolder: data.accountHolder || undefined,
        logoUrl: data.logoUrl || undefined,
        invoicePrefix: data.invoicePrefix || undefined,
        invoiceFooterText: data.invoiceFooterText || undefined,
      }),
    onSuccess: async () => {
      toast.success("Store settings saved");
      await qc.invalidateQueries({
        queryKey: adminGetStoreSettingsQueryKey(),
      });
    },
    onError: (e: Error) => {
      const msg =
        e instanceof SdkRequestError ? e.message : (e.message ?? "Failed");
      toast.error(msg);
    },
  });

  return {
    form,
    isLoading,
    isSaving: mutation.isPending,
    onSubmit: form.handleSubmit((vals) => mutation.mutate(vals)),
  };
}
