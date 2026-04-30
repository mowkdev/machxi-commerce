import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaxClassCombobox } from "@/features/tax-classes/components/TaxClassCombobox";
import type {
  CreateShippingOptionBody,
  ShippingOptionDetail,
} from "@repo/types/admin";
import {
  useCreateShippingOption,
  useDeleteShippingOption,
  useShippingZonesOptions,
  useUpdateShippingOption,
} from "../hooks";

interface ShippingOptionFormProps {
  mode: "create" | "edit";
  initialData?: ShippingOptionDetail;
}

interface PriceDraft {
  currencyCode: string;
  amount: string;
  compareAtAmount: string;
  minQuantity: string;
  taxInclusive: boolean;
}

const emptyPriceDraft: PriceDraft = {
  currencyCode: "EUR",
  amount: "0",
  compareAtAmount: "",
  minQuantity: "1",
  taxInclusive: true,
};

function priceToDraft(
  price: ShippingOptionDetail["prices"][number],
): PriceDraft {
  return {
    currencyCode: price.currencyCode,
    amount: String(price.amount),
    compareAtAmount:
      price.compareAtAmount === null ? "" : String(price.compareAtAmount),
    minQuantity: String(price.minQuantity),
    taxInclusive: price.taxInclusive,
  };
}

function normalizePrices(
  prices: PriceDraft[],
): CreateShippingOptionBody["prices"] {
  return prices.map((price) => ({
    currencyCode: price.currencyCode.trim().toUpperCase(),
    amount: Number(price.amount),
    compareAtAmount: price.compareAtAmount
      ? Number(price.compareAtAmount)
      : undefined,
    minQuantity: Number(price.minQuantity || 1),
    taxInclusive: price.taxInclusive,
  }));
}

export function ShippingOptionForm({
  mode,
  initialData,
}: ShippingOptionFormProps) {
  const navigate = useNavigate();
  const createMutation = useCreateShippingOption();
  const updateMutation = useUpdateShippingOption(initialData?.id ?? "");
  const deleteMutation = useDeleteShippingOption();
  const { data: zones, isPending: isLoadingZones } = useShippingZonesOptions();
  const isCreateMode = mode === "create";
  const isPending = createMutation.isPending || updateMutation.isPending;
  const [name, setName] = useState(initialData?.name ?? "");
  const [taxClassId, setTaxClassId] = useState(initialData?.taxClassId ?? "");
  const [zoneIds, setZoneIds] = useState<string[]>(
    initialData?.zones.map((zone) => zone.zoneId) ?? [],
  );
  const [prices, setPrices] = useState<PriceDraft[]>(
    initialData?.prices.length
      ? initialData.prices.map(priceToDraft)
      : [emptyPriceDraft],
  );
  const [error, setError] = useState<string | null>(null);
  const title = isCreateMode ? "New shipping option" : name || "Untitled";
  const zoneOptions = zones ?? [];

  useEffect(() => {
    if (!initialData) return;
    setName(initialData.name);
    setTaxClassId(initialData.taxClassId);
    setZoneIds(initialData.zones.map((zone) => zone.zoneId));
    setPrices(
      initialData.prices.length
        ? initialData.prices.map(priceToDraft)
        : [emptyPriceDraft],
    );
  }, [initialData]);

  const selectedZoneNames = useMemo(
    () =>
      zoneOptions
        .filter((zone) => zoneIds.includes(zone.id))
        .map((zone) => zone.name)
        .join(", "),
    [zoneIds, zoneOptions],
  );

  const updatePrice = (
    index: number,
    field: keyof PriceDraft,
    value: string | boolean,
  ) => {
    setPrices((current) =>
      current.map((price, priceIndex) =>
        priceIndex === index ? { ...price, [field]: value } : price,
      ),
    );
  };

  const addPrice = () => {
    setPrices((current) => [...current, { ...emptyPriceDraft }]);
  };

  const removePrice = (index: number) => {
    setPrices((current) =>
      current.filter((_, priceIndex) => priceIndex !== index),
    );
  };

  const toggleZone = (zoneId: string, checked: boolean) => {
    setZoneIds((current) =>
      checked
        ? [...new Set([...current, zoneId])]
        : current.filter((id) => id !== zoneId),
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedPrices = normalizePrices(prices);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!taxClassId) {
      setError("Tax class is required.");
      return;
    }
    if (
      normalizedPrices.length === 0 ||
      normalizedPrices.some(
        (price) =>
          !/^[A-Z]{3}$/.test(price.currencyCode) ||
          !Number.isInteger(price.amount) ||
          price.amount < 0 ||
          !Number.isInteger(price.minQuantity) ||
          price.minQuantity < 1,
      )
    ) {
      setError(
        "Prices require a 3-letter currency, non-negative amount, and minimum quantity.",
      );
      return;
    }

    const body = {
      name: name.trim(),
      taxClassId,
      zoneIds,
      prices: normalizedPrices,
    };

    if (isCreateMode) {
      createMutation.mutate(body);
    } else {
      updateMutation.mutate(body);
    }
  };

  return (
    <FormPageShell
      title={title}
      onBack={() => navigate("/shipping-options")}
      onSubmit={submit}
      submitLabel={isPending ? "Saving..." : isCreateMode ? "Create" : "Save"}
      isSubmitting={isPending}
      contentClassName="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 lg:p-6"
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
            Shipping options reference a tax class and own a price set with one
            or more prices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Standard shipping"
              />
            </Field>
            <Field>
              <FieldLabel>Tax class</FieldLabel>
              <TaxClassCombobox value={taxClassId} onChange={setTaxClassId} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zones</CardTitle>
          <CardDescription>
            {selectedZoneNames ||
              "Select the zones where this option should be available."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {isLoadingZones ? (
            <p className="text-sm text-muted-foreground">Loading zones...</p>
          ) : null}
          {!isLoadingZones && zoneOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create a shipping zone before assigning this option.
            </p>
          ) : null}
          {zoneOptions.map((zone) => (
            <label
              key={zone.id}
              className="flex items-start gap-3 rounded-md border p-3 text-sm"
            >
              <Checkbox
                checked={zoneIds.includes(zone.id)}
                onCheckedChange={(checked) =>
                  toggleZone(zone.id, checked === true)
                }
              />
              <span>
                <span className="block font-medium">{zone.name}</span>
                <span className="text-muted-foreground">
                  {zone.countryCodes.length
                    ? zone.countryCodes.join(", ")
                    : "No countries"}
                </span>
              </span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Prices</CardTitle>
              <CardDescription>
                Prices are stored in the option price set and keyed by currency
                and minimum quantity.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPrice}
            >
              Add price
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Compare at</TableHead>
                <TableHead>Min qty</TableHead>
                <TableHead>Tax incl.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((price, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={price.currencyCode}
                      onChange={(event) =>
                        updatePrice(index, "currencyCode", event.target.value)
                      }
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={price.amount}
                      onChange={(event) =>
                        updatePrice(index, "amount", event.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={price.compareAtAmount}
                      onChange={(event) =>
                        updatePrice(
                          index,
                          "compareAtAmount",
                          event.target.value,
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={price.minQuantity}
                      onChange={(event) =>
                        updatePrice(index, "minQuantity", event.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={price.taxInclusive}
                      onCheckedChange={(checked) =>
                        updatePrice(index, "taxInclusive", checked === true)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={prices.length === 1}
                      onClick={() => removePrice(index)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!isCreateMode && initialData ? (
        <Card>
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>
              Deleting an option also deletes its owned shipping price set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger
                type="button"
                className={buttonVariants({ variant: "destructive" })}
              >
                Delete shipping option
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete shipping option?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the option, its zone assignments, and its
                    prices. This cannot be undone.
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
