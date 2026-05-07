import { Controller, FormProvider } from "react-hook-form";
import { FormContentLayout } from "@/components/form-content-layout";
import { FormPageShell } from "@/components/form-page-shell";
import { RecordTimestamps } from "@/components/record-timestamps";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { CurrencyDetail } from "@repo/types/admin";
import { useCurrencyForm } from "../hooks/useCurrencyForm";

interface CurrencyFormProps {
  mode: "create" | "edit";
  initialData?: CurrencyDetail;
}

export function CurrencyForm({ mode, initialData }: CurrencyFormProps) {
  const {
    form,
    isCreateMode,
    isPending,
    navigateToCurrencies,
    onSubmit,
    title,
  } = useCurrencyForm({ mode, initialData });
  const isCurrentDefault = !isCreateMode && initialData?.isDefault;

  return (
    <FormProvider {...form}>
      <FormPageShell
        title={title}
        onBack={navigateToCurrencies}
        onSubmit={onSubmit}
        submitLabel={
          isPending ? "Saving..." : isCreateMode ? "Create" : "Save"
        }
        isSubmitting={isPending}
      >
        <FormContentLayout maxWidth="xl">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>
                {isCreateMode
                  ? "ISO-style 3-letter code and metadata. Use standard codes when possible."
                  : "Core fields are fixed after creation — adjust storefront flags below."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="code">Code</FieldLabel>
                  <Input
                    id="code"
                    placeholder="e.g. USD"
                    disabled={!isCreateMode}
                    autoCapitalize="characters"
                    {...form.register("code")}
                  />
                  <FieldDescription>
                    {isCreateMode
                      ? "Three letters; stored uppercase (ISO-4217 style)."
                      : "Currency code cannot be changed after creation."}
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.code]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input
                    id="name"
                    placeholder="e.g. US Dollar"
                    disabled={!isCreateMode}
                    {...form.register("name")}
                  />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="symbol">Symbol</FieldLabel>
                  <Input
                    id="symbol"
                    placeholder="e.g. $"
                    disabled={!isCreateMode}
                    maxLength={8}
                    {...form.register("symbol")}
                  />
                  <FieldError errors={[form.formState.errors.symbol]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="decimalDigits">
                    Decimal digits
                  </FieldLabel>
                  <Input
                    id="decimalDigits"
                    type="number"
                    disabled={!isCreateMode}
                    {...form.register("decimalDigits", { valueAsNumber: true })}
                  />
                  <FieldDescription>
                    Fraction digits for formatting (e.g. 2 for USD, 0 for JPY).
                  </FieldDescription>
                  <FieldError
                    errors={[form.formState.errors.decimalDigits]}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storefront availability</CardTitle>
              <CardDescription>
                Active currencies appear in the storefront switcher. The default
                is used when the shopper has no stored preference.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field orientation="horizontal">
                  <Controller
                    name="isActive"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        id="isActive"
                        checked={field.value ?? false}
                        disabled={!!isCurrentDefault}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    )}
                  />
                  <FieldContent>
                    <FieldTitle>Active</FieldTitle>
                    <FieldDescription>
                      Inactive currencies are hidden from the storefront.
                      {isCurrentDefault
                        ? " The default currency must stay active."
                        : null}
                    </FieldDescription>
                  </FieldContent>
                </Field>
                <Field orientation="horizontal">
                  <Controller
                    name="isDefault"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        id="isDefault"
                        checked={field.value ?? false}
                        disabled={!!isCurrentDefault}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    )}
                  />
                  <FieldContent>
                    <FieldTitle>Default currency</FieldTitle>
                    <FieldDescription>
                      Setting this on create promotes this row and demotes the
                      previous default.
                      {isCurrentDefault
                        ? " Promote another currency to change the store default."
                        : null}
                    </FieldDescription>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="displayOrder">Display order</FieldLabel>
                  <Input
                    id="displayOrder"
                    type="number"
                    {...form.register("displayOrder", { valueAsNumber: true })}
                  />
                  <FieldDescription>
                    Lower numbers appear first in the currency switcher.
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.displayOrder]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          {!isCreateMode && initialData ? (
            <RecordTimestamps record={initialData} />
          ) : null}
        </FormContentLayout>
      </FormPageShell>
    </FormProvider>
  );
}
