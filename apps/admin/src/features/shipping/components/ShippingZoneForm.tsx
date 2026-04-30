import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FormPageShell } from "@/components/form-page-shell";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ShippingZoneDetail } from "@repo/types/admin";
import {
  useCreateShippingZone,
  useDeleteShippingZone,
  useUpdateShippingZone,
} from "../hooks";

interface ShippingZoneFormProps {
  mode: "create" | "edit";
  initialData?: ShippingZoneDetail;
}

function parseCountryCodes(value: string) {
  return value
    .split(/[\s,]+/)
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
}

function formatCountryCodes(zone?: ShippingZoneDetail) {
  return zone?.countries.map((country) => country.countryCode).join(", ") ?? "";
}

export function ShippingZoneForm({ mode, initialData }: ShippingZoneFormProps) {
  const navigate = useNavigate();
  const createMutation = useCreateShippingZone();
  const updateMutation = useUpdateShippingZone(initialData?.id ?? "");
  const deleteMutation = useDeleteShippingZone();
  const isCreateMode = mode === "create";
  const isPending = createMutation.isPending || updateMutation.isPending;
  const [name, setName] = useState(initialData?.name ?? "");
  const [countryCodes, setCountryCodes] = useState(
    formatCountryCodes(initialData),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCountryCodes(formatCountryCodes(initialData));
    }
  }, [initialData]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsedCountryCodes = parseCountryCodes(countryCodes);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!parsedCountryCodes.every((code) => /^[A-Z]{2}$/.test(code))) {
      setError("Use two-letter country codes separated by commas or spaces.");
      return;
    }

    const body = {
      name: name.trim(),
      countryCodes: parsedCountryCodes,
    };

    if (isCreateMode) {
      createMutation.mutate(body);
    } else {
      updateMutation.mutate(body);
    }
  };

  return (
    <FormPageShell
      title={isCreateMode ? "New shipping zone" : name || "Untitled"}
      onBack={() => navigate("/shipping-zones")}
      onSubmit={onSubmit}
      submitLabel={isPending ? "Saving..." : isCreateMode ? "Create" : "Save"}
      isSubmitting={isPending}
      contentClassName="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 lg:p-6"
    >
      {error ? (
        <p className="rounded-md border border-destructive p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Zones group countries so shipping options can be offered to eligible
            addresses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                placeholder="e.g. Europe"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="countryCodes">Countries</FieldLabel>
              <Textarea
                id="countryCodes"
                placeholder="US, CA, GB"
                rows={4}
                value={countryCodes}
                onChange={(event) => setCountryCodes(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Enter ISO 3166-1 alpha-2 country codes. Codes are normalized to
                uppercase.
              </p>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {!isCreateMode && initialData ? (
        <Card>
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>
              Deleting a zone also removes its country and option assignments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger
                type="button"
                className={buttonVariants({ variant: "destructive" })}
              >
                Delete shipping zone
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete shipping zone?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the zone from any shipping options. This cannot
                    be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(initialData.id)}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      ) : null}
    </FormPageShell>
  );
}
