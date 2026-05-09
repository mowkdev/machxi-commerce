import { useEffect } from "react";
import { Controller, FormProvider } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { FormContentLayout } from "@/components/form-content-layout";
import { FormPageShell } from "@/components/form-page-shell";
import { RecordTimestamps } from "@/components/record-timestamps";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdminListBuiltInPaymentProviders } from "@repo/admin-sdk";
import type { PaymentProviderDetail } from "@repo/types/admin";
import { usePaymentProviderForm } from "../hooks/usePaymentProviderForm";

interface PaymentProviderFormProps {
  mode: "create" | "edit";
  initial?: PaymentProviderDetail;
}

export function PaymentProviderForm({ mode, initial }: PaymentProviderFormProps) {
  const ctx = usePaymentProviderForm({ mode, initial });
  const isCreate = ctx.mode === "create";

  if (isCreate) {
    return <PaymentProviderCreateFormInner ctx={ctx} />;
  }
  return <PaymentProviderEditFormInner ctx={ctx} />;
}

function PaymentProviderCreateFormInner({
  ctx,
}: {
  ctx: ReturnType<typeof usePaymentProviderForm> & { mode: "create" };
}) {
  const navigate = useNavigate();
  const { form, createMutation, onSubmit } = ctx;
  const code = form.watch("code");
  const { data: builtInResponse } = useAdminListBuiltInPaymentProviders();
  const builtInProviders = builtInResponse?.data ?? [];

  useEffect(() => {
    const match = builtInProviders.find((p) => p.code === code);
    if (match) {
      form.setValue("kind", match.kind);
    }
  }, [code, form, builtInProviders]);

  const isPending = createMutation.isPending;
  const title = "New payment provider";

  return (
    <FormProvider {...form}>
      <FormPageShell
        title={title}
        onBack={() => navigate("/settings/payments/providers")}
        onSubmit={onSubmit}
        submitLabel={isPending ? "Creating…" : "Create"}
        isSubmitting={isPending}
      >
        <FormContentLayout maxWidth="xl">
          <Card>
            <CardHeader>
              <CardTitle>Provider</CardTitle>
              <CardDescription>
                Choose a built-in code. To accept cards, enable Stripe only
                after <code className="text-xs">STRIPE_SECRET_KEY</code> is set
                on the API.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel>Code</FieldLabel>
                  <Controller
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full max-w-md">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {builtInProviders.map((p) => (
                            <SelectItem key={p.code} value={p.code}>
                              {p.code} ({p.displayName})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[form.formState.errors.code]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pp-name">Name</FieldLabel>
                  <Input
                    id="pp-name"
                    placeholder="Displayed at checkout"
                    {...form.register("name")}
                  />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pp-desc">Description</FieldLabel>
                  <Textarea
                    id="pp-desc"
                    rows={2}
                    placeholder="Optional"
                    {...form.register("description")}
                  />
                </Field>
                <Field>
                  <FieldLabel>Kind</FieldLabel>
                  <Controller
                    control={form.control}
                    name="kind"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full max-w-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">manual</SelectItem>
                          <SelectItem value="automatic">automatic</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field orientation="horizontal">
                  <div className="flex flex-1 flex-col gap-1">
                    <FieldLabel htmlFor="pp-enabled">Enabled</FieldLabel>
                    <FieldDescription>
                      Automatic providers need valid API credentials before
                      enabling.
                    </FieldDescription>
                  </div>
                  <Controller
                    control={form.control}
                    name="isEnabled"
                    render={({ field }) => (
                      <Switch
                        id="pp-enabled"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pp-order">Display order</FieldLabel>
                  <Input
                    id="pp-order"
                    type="number"
                    className="max-w-32"
                    {...form.register("displayOrder", { valueAsNumber: true })}
                  />
                  <FieldError errors={[form.formState.errors.displayOrder]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Configuration (JSON)</CardTitle>
              <CardDescription>
                For Stripe, include e.g.{" "}
                <code className="text-xs">publishableKey</code> for the
                storefront. Secrets stay in server env vars.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Field>
                <Textarea
                  rows={12}
                  className="font-mono text-xs"
                  {...form.register("configJson")}
                />
                <FieldError errors={[form.formState.errors.configJson]} />
              </Field>
            </CardContent>
          </Card>
        </FormContentLayout>
      </FormPageShell>
    </FormProvider>
  );
}

function PaymentProviderEditFormInner({
  ctx,
}: {
  ctx: ReturnType<typeof usePaymentProviderForm> & { mode: "edit" };
}) {
  const {
    form,
    updateMutation,
    deleteMutation,
    configMutation,
    configJson,
    setConfigJson,
    navigateBack,
    onSubmit,
    onSaveConfig,
    initial,
  } = ctx;
  const title = form.watch("name") || initial.code;

  return (
    <FormProvider {...form}>
      <FormPageShell
        title={title}
        onBack={navigateBack}
        onSubmit={onSubmit}
        submitLabel={updateMutation.isPending ? "Saving…" : "Save"}
        isSubmitting={updateMutation.isPending}
        headerActions={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete payment provider?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the configuration row. Existing orders are
                  unchanged.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => deleteMutation.mutate()}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      >
        <FormContentLayout maxWidth="xl">
          <div className="flex flex-wrap items-center gap-2 px-1">
            <Badge variant="secondary">{initial.code}</Badge>
            <span className="text-sm text-muted-foreground">
              Code is fixed after creation.
            </span>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>
                Display name, kind, and checkout availability.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="pp-name-e">Name</FieldLabel>
                  <Input id="pp-name-e" {...form.register("name")} />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pp-desc-e">Description</FieldLabel>
                  <Textarea
                    id="pp-desc-e"
                    rows={2}
                    {...form.register("description")}
                  />
                </Field>
                <Field>
                  <FieldLabel>Kind</FieldLabel>
                  <Controller
                    control={form.control}
                    name="kind"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full max-w-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">manual</SelectItem>
                          <SelectItem value="automatic">automatic</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field orientation="horizontal">
                  <FieldLabel htmlFor="pp-enabled-e">Enabled</FieldLabel>
                  <Controller
                    control={form.control}
                    name="isEnabled"
                    render={({ field }) => (
                      <Switch
                        id="pp-enabled-e"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pp-order-e">Display order</FieldLabel>
                  <Input
                    id="pp-order-e"
                    type="number"
                    className="max-w-32"
                    {...form.register("displayOrder", { valueAsNumber: true })}
                  />
                  <FieldError errors={[form.formState.errors.displayOrder]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Configuration (JSON)</CardTitle>
              <CardDescription>
                Saved separately from general fields. Invalid JSON is rejected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={14}
                className="font-mono text-xs"
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                disabled={configMutation.isPending}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={configMutation.isPending}
                onClick={onSaveConfig}
              >
                {configMutation.isPending ? "Saving config…" : "Save config"}
              </Button>
            </CardContent>
          </Card>
          <RecordTimestamps record={initial} />
        </FormContentLayout>
      </FormPageShell>
    </FormProvider>
  );
}
