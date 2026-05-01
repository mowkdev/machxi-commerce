import { Controller, FormProvider } from "react-hook-form";
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
import { buttonVariants } from "@/components/ui/button";
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
import type { LanguageDetail } from "@repo/types/admin";
import { useDeleteLanguage } from "../hooks";
import { useLanguageForm } from "../hooks/useLanguageForm";

interface LanguageFormProps {
  mode: "create" | "edit";
  initialData?: LanguageDetail;
}

export function LanguageForm({ mode, initialData }: LanguageFormProps) {
  const deleteMutation = useDeleteLanguage();
  const {
    form,
    isCreateMode,
    isPending,
    navigateToLanguages,
    onSubmit,
    title,
  } = useLanguageForm({ mode, initialData });
  const isCurrentDefault = !isCreateMode && initialData?.isDefault;

  return (
    <FormProvider {...form}>
      <FormPageShell
        title={title}
        onBack={navigateToLanguages}
        onSubmit={onSubmit}
        submitLabel={isPending ? "Saving..." : isCreateMode ? "Create" : "Save"}
        isSubmitting={isPending}
      >
        <FormContentLayout maxWidth="xl">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>
                Languages are used by product, category, promotion, and pricing
                translations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="code">Code</FieldLabel>
                  <Input
                    id="code"
                    placeholder="e.g. en or en-US"
                    disabled={!isCreateMode}
                    {...form.register("code")}
                  />
                  <FieldDescription>
                    The code is the language identifier and cannot be changed
                    after creation.
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.code]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input
                    id="name"
                    placeholder="e.g. English"
                    {...form.register("name")}
                  />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>
                <Field orientation="horizontal">
                  <Controller
                    name="isDefault"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        id="isDefault"
                        checked={field.value}
                        disabled={isCurrentDefault}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    )}
                  />
                  <FieldContent>
                    <FieldTitle>Default language</FieldTitle>
                    <FieldDescription>
                      Catalog screens use the default language when no specific
                      language is selected.
                      {isCurrentDefault
                        ? " This language is the store default; set another language as default to change it."
                        : null}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          {!isCreateMode && initialData && initialData.isDefault ? (
            <Card>
              <CardHeader>
                <CardTitle>Delete</CardTitle>
                <CardDescription>
                  The store default language cannot be deleted. Set another
                  language as default first, then you can remove this one if
                  nothing references it.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}
          {!isCreateMode && initialData && !initialData.isDefault ? (
            <Card>
              <CardHeader>
                <CardTitle>Danger zone</CardTitle>
                <CardDescription>
                  Delete this language only if no translations reference it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger
                    type="button"
                    className={buttonVariants({ variant: "destructive" })}
                  >
                    Delete language
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete language?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This cannot be undone. Languages referenced by
                        translations cannot be deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(initialData.code)}
                      >
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ) : null}
          {!isCreateMode && initialData ? (
            <RecordTimestamps record={initialData} />
          ) : null}
        </FormContentLayout>
      </FormPageShell>
    </FormProvider>
  );
}
