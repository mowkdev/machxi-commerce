import { FormProvider } from "react-hook-form";
import { FormPageShell } from "@/components/form-page-shell";
import { FormContentLayout } from "@/components/form-content-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { useStoreSettingsForm } from "../hooks/useStoreSettingsForm";

export function StoreSettingsForm() {
  const { form, isLoading, isSaving, onSubmit } = useStoreSettingsForm();
  const {
    register,
    formState: { errors },
  } = form;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <FormPageShell
        title="Store Settings"
        onBack={() => window.history.back()}
        submitLabel="Save"
        onSubmit={onSubmit}
        isSubmitting={isSaving}
        canSubmit={!isSaving}
      >
        <FormContentLayout maxWidth="3xl">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel>Company Name *</FieldLabel>
                <Input {...register("companyName")} placeholder="Acme GmbH" />
                <FieldError errors={[errors.companyName]} />
              </Field>
              <Field>
                <FieldLabel>Tax ID</FieldLabel>
                <Input {...register("taxId")} placeholder="DE123456789" />
                <FieldError errors={[errors.taxId]} />
              </Field>
              <Field>
                <FieldLabel>VAT Number</FieldLabel>
                <Input {...register("vatNumber")} placeholder="DE123456789" />
                <FieldError errors={[errors.vatNumber]} />
              </Field>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Business Address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel>Street</FieldLabel>
                <Input
                  {...register("addressStreet")}
                  placeholder="Hauptstrasse 1"
                />
                <FieldError errors={[errors.addressStreet]} />
              </Field>
              <Field>
                <FieldLabel>City</FieldLabel>
                <Input {...register("addressCity")} placeholder="Berlin" />
                <FieldError errors={[errors.addressCity]} />
              </Field>
              <Field>
                <FieldLabel>ZIP Code</FieldLabel>
                <Input {...register("addressZip")} placeholder="10115" />
                <FieldError errors={[errors.addressZip]} />
              </Field>
              <Field>
                <FieldLabel>Country (ISO 2-letter)</FieldLabel>
                <Input
                  {...register("addressCountry")}
                  placeholder="DE"
                  maxLength={2}
                  className="uppercase"
                />
                <FieldError errors={[errors.addressCountry]} />
              </Field>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Account Holder</FieldLabel>
                <Input
                  {...register("accountHolder")}
                  placeholder="Acme GmbH"
                />
                <FieldError errors={[errors.accountHolder]} />
              </Field>
              <Field>
                <FieldLabel>Bank Name</FieldLabel>
                <Input {...register("bankName")} placeholder="Deutsche Bank" />
                <FieldError errors={[errors.bankName]} />
              </Field>
              <Field>
                <FieldLabel>IBAN</FieldLabel>
                <Input
                  {...register("iban")}
                  placeholder="DE89370400440532013000"
                />
                <FieldError errors={[errors.iban]} />
              </Field>
              <Field>
                <FieldLabel>BIC / SWIFT</FieldLabel>
                <Input {...register("bic")} placeholder="COBADEFFXXX" />
                <FieldError errors={[errors.bic]} />
              </Field>
            </CardContent>
          </Card>

          {/* Invoice Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Invoice Number Prefix</FieldLabel>
                <Input
                  {...register("invoicePrefix")}
                  placeholder="INV"
                  className="uppercase"
                />
                <FieldError errors={[errors.invoicePrefix]} />
              </Field>
              <Field>
                <FieldLabel>Logo URL</FieldLabel>
                <Input
                  {...register("logoUrl")}
                  placeholder="https://example.com/logo.png"
                />
                <FieldError errors={[errors.logoUrl]} />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel>Invoice Footer Text</FieldLabel>
                <Textarea
                  {...register("invoiceFooterText")}
                  placeholder="Thank you for your business! All prices include applicable taxes."
                  rows={3}
                />
                <FieldError errors={[errors.invoiceFooterText]} />
              </Field>
            </CardContent>
          </Card>
        </FormContentLayout>
      </FormPageShell>
    </FormProvider>
  );
}
