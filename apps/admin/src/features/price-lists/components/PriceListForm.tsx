import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Controller, FormProvider } from 'react-hook-form';
import { FormPageShell } from '@/components/form-page-shell';
import { SidePanelForm } from '@/components/side-panel-form';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { PriceListDetail, PriceListPrice, PriceSetTarget } from '@repo/types/admin';
import {
  useCreatePriceListPrice,
  useDeletePriceList,
  useDeletePriceListPrice,
  usePriceSetTargets,
  useUpdatePriceListPrice,
} from '../hooks';
import { usePriceListForm } from '../hooks/usePriceListForm';
import {
  normalizePriceListPriceFormValues,
  priceListPriceFormSchema,
  type PriceListPriceFormInput,
} from '../schema';

interface PriceListFormProps {
  mode: 'create' | 'edit';
  initialData?: PriceListDetail;
}

const emptyPriceFormValues: PriceListPriceFormInput = {
  priceSetId: '',
  currencyCode: '',
  amount: '',
  minQuantity: '1',
};

function toDateTimeLocalValue(value: string | null | undefined) {
  return value ? value.slice(0, 16) : '';
}

function priceToFormValues(price: PriceListPrice): PriceListPriceFormInput {
  return {
    priceSetId: price.priceSetId,
    currencyCode: price.currencyCode,
    amount: String(price.amount),
    minQuantity: String(price.minQuantity),
  };
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : 'Always';
}

function formatAmount(amount: number, currencyCode: string) {
  return `${amount.toLocaleString()} ${currencyCode}`;
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function targetLabel(target: PriceSetTarget) {
  const product = target.productName ?? 'Untitled product';
  return `${product} / ${target.sku}`;
}

export function PriceListForm({ mode, initialData }: PriceListFormProps) {
  const [priceDraft, setPriceDraft] =
    useState<PriceListPriceFormInput>(emptyPriceFormValues);
  const [editingPrice, setEditingPrice] = useState<PriceListPrice | null>(null);
  const [priceErrors, setPriceErrors] = useState<Record<string, string>>({});
  const [isPriceFormOpen, setIsPriceFormOpen] = useState(false);
  const { data: priceSetTargets = [], isPending: isTargetsPending } = usePriceSetTargets();
  const createPriceMutation = useCreatePriceListPrice(initialData?.id ?? '');
  const updatePriceMutation = useUpdatePriceListPrice(initialData?.id ?? '');
  const deletePriceMutation = useDeletePriceListPrice(initialData?.id ?? '');
  const deletePriceListMutation = useDeletePriceList();
  const {
    form,
    isCreateMode,
    isEditMode,
    isPending,
    navigateToPriceLists,
    onSubmit,
    title,
  } = usePriceListForm({ mode, initialData });

  const prices = useMemo(() => initialData?.prices ?? [], [initialData?.prices]);
  const targetMap = useMemo(
    () => new Map(priceSetTargets.map((target) => [target.priceSetId, target])),
    [priceSetTargets]
  );
  const selectedTarget = targetMap.get(priceDraft.priceSetId);
  const basePriceOptions = selectedTarget?.basePrices ?? [];
  const isPriceMutationPending =
    createPriceMutation.isPending || updatePriceMutation.isPending;

  const openNewPriceForm = () => {
    const firstTarget = priceSetTargets[0];
    const firstBasePrice = firstTarget?.basePrices[0];
    setEditingPrice(null);
    setPriceDraft({
      priceSetId: firstTarget?.priceSetId ?? '',
      currencyCode: firstBasePrice?.currencyCode ?? '',
      amount: '',
      minQuantity: firstBasePrice ? String(firstBasePrice.minQuantity) : '1',
    });
    setPriceErrors({});
    setIsPriceFormOpen(true);
  };

  const openEditPriceForm = (price: PriceListPrice) => {
    setEditingPrice(price);
    setPriceDraft(priceToFormValues(price));
    setPriceErrors({});
    setIsPriceFormOpen(true);
  };

  const closePriceForm = () => {
    setEditingPrice(null);
    setPriceDraft(emptyPriceFormValues);
    setPriceErrors({});
    setIsPriceFormOpen(false);
  };

  const updatePriceDraft = (field: keyof PriceListPriceFormInput, value: string) => {
    setPriceDraft((current) => ({ ...current, [field]: value }));
  };

  const selectTarget = (priceSetId: string) => {
    const target = targetMap.get(priceSetId);
    const firstBasePrice = target?.basePrices[0];
    setPriceDraft((current) => ({
      ...current,
      priceSetId,
      currencyCode: firstBasePrice?.currencyCode ?? '',
      minQuantity: firstBasePrice ? String(firstBasePrice.minQuantity) : '1',
    }));
  };

  const selectCurrency = (currencyCode: string) => {
    const matchingBasePrice = basePriceOptions.find(
      (price) => price.currencyCode === currencyCode
    );
    setPriceDraft((current) => ({
      ...current,
      currencyCode,
      minQuantity: matchingBasePrice
        ? String(matchingBasePrice.minQuantity)
        : current.minQuantity,
    }));
  };

  const savePrice = () => {
    if (!initialData) return;

    const result = priceListPriceFormSchema.safeParse(priceDraft);
    if (!result.success) {
      setPriceErrors(
        result.error.issues.reduce<Record<string, string>>((acc, issue) => {
          const key = String(issue.path[0]);
          acc[key] = issue.message;
          return acc;
        }, {})
      );
      return;
    }

    const body = normalizePriceListPriceFormValues(priceDraft);
    if (editingPrice) {
      updatePriceMutation.mutate(
        { priceId: editingPrice.id, body },
        { onSuccess: closePriceForm }
      );
    } else {
      createPriceMutation.mutate(body, { onSuccess: closePriceForm });
    }
  };

  const submitPriceForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    savePrice();
  };

  return (
    <FormProvider {...form}>
      <FormPageShell
        title={title}
        onBack={navigateToPriceLists}
        onSubmit={onSubmit}
        submitLabel={isPending ? 'Saving...' : isCreateMode ? 'Create' : 'Save'}
        isSubmitting={isPending}
        contentClassName="grid gap-6 p-4 lg:grid-cols-3 lg:p-6"
      >
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>
                Price lists apply scheduled sale or override prices to selected product variants.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input
                    id="name"
                    placeholder="e.g. Summer sale"
                    {...form.register('name')}
                  />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Controller
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <Textarea
                        id="description"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Internal note or storefront copy"
                      />
                    )}
                  />
                  <FieldError errors={[form.formState.errors.description]} />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <Controller
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError errors={[form.formState.errors.status]} />
                  </Field>
                  <Field>
                    <FieldLabel>Type</FieldLabel>
                    <Controller
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sale">Sale</SelectItem>
                            <SelectItem value="override">Override</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError errors={[form.formState.errors.type]} />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="starts-at">Starts at</FieldLabel>
                    <Input
                      id="starts-at"
                      type="datetime-local"
                      {...form.register('startsAt')}
                    />
                    <FieldError errors={[form.formState.errors.startsAt]} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ends-at">Ends at</FieldLabel>
                    <Input
                      id="ends-at"
                      type="datetime-local"
                      {...form.register('endsAt')}
                    />
                    <FieldError errors={[form.formState.errors.endsAt]} />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Prices ({prices.length})</CardTitle>
                  <CardDescription>
                    Add overrides for product variant base prices. Currency and minimum quantity
                    must match an existing base price.
                  </CardDescription>
                </div>
                {isEditMode && initialData ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={openNewPriceForm}
                    disabled={isTargetsPending || priceSetTargets.length === 0}
                  >
                    Add price
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-hidden rounded-b-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Target</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Min qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isCreateMode ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                          Create the price list before adding product price overrides.
                        </TableCell>
                      </TableRow>
                    ) : priceSetTargets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                          No product variants with base prices are available yet.
                        </TableCell>
                      </TableRow>
                    ) : prices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                          No price overrides have been configured yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      prices.map((price) => {
                        const target = targetMap.get(price.priceSetId);
                        return (
                          <TableRow
                            key={price.id}
                            className="cursor-pointer"
                            onClick={() => openEditPriceForm(price)}
                          >
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {target ? targetLabel(target) : `Price set ${shortId(price.priceSetId)}`}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {price.currencyCode}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{formatAmount(price.amount, price.currencyCode)}</TableCell>
                            <TableCell>{price.minQuantity}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <SidePanelForm
            open={isPriceFormOpen}
            onOpenChange={(open) => {
              if (!open) closePriceForm();
              else setIsPriceFormOpen(true);
            }}
            title={editingPrice ? 'Edit price override' : 'Add price override'}
            description={
              <div className="flex flex-wrap gap-1.5">
                {selectedTarget ? (
                  <>
                    <Badge variant="secondary">{targetLabel(selectedTarget)}</Badge>
                    <Badge variant="outline">
                      {selectedTarget.basePrices.length} base price
                      {selectedTarget.basePrices.length === 1 ? '' : 's'}
                    </Badge>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    Select a product variant price set.
                  </span>
                )}
              </div>
            }
            formId="price-list-price-form"
            onSubmit={submitPriceForm}
            submitLabel={isPriceMutationPending ? 'Saving...' : 'Save price'}
            isSubmitting={isPriceMutationPending}
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Product variant</FieldLabel>
                <Select value={priceDraft.priceSetId} onValueChange={selectTarget}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {priceSetTargets.map((target) => (
                      <SelectItem key={target.priceSetId} value={target.priceSetId}>
                        {targetLabel(target)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[{ message: priceErrors.priceSetId }]} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Currency</FieldLabel>
                  {basePriceOptions.length > 0 ? (
                    <Select value={priceDraft.currencyCode} onValueChange={selectCurrency}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {basePriceOptions.map((price) => (
                          <SelectItem
                            key={`${price.currencyCode}-${price.minQuantity}`}
                            value={price.currencyCode}
                          >
                            {price.currencyCode} · min {price.minQuantity}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={priceDraft.currencyCode}
                      onChange={(event) => updatePriceDraft('currencyCode', event.target.value)}
                      placeholder="USD"
                    />
                  )}
                  <FieldError errors={[{ message: priceErrors.currencyCode }]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="price-min-quantity">Minimum quantity</FieldLabel>
                  <Input
                    id="price-min-quantity"
                    type="number"
                    min={1}
                    value={priceDraft.minQuantity}
                    onChange={(event) => updatePriceDraft('minQuantity', event.target.value)}
                  />
                  <FieldError errors={[{ message: priceErrors.minQuantity }]} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="price-amount">Amount</FieldLabel>
                <Input
                  id="price-amount"
                  type="number"
                  min={0}
                  value={priceDraft.amount}
                  onChange={(event) => updatePriceDraft('amount', event.target.value)}
                  placeholder="1999"
                />
                <FieldError errors={[{ message: priceErrors.amount }]} />
              </Field>
              {editingPrice ? (
                <div className="rounded-lg border p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-medium">Delete price override</h3>
                    <p className="text-sm text-muted-foreground">
                      Remove this override from the price list.
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger
                      type="button"
                      className={buttonVariants({ variant: 'destructive', size: 'sm' })}
                    >
                      Delete price
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete price override?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the {editingPrice.currencyCode} override from this price list.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() =>
                            deletePriceMutation.mutate(editingPrice.id, {
                              onSuccess: closePriceForm,
                            })
                          }
                        >
                          {deletePriceMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : null}
            </FieldGroup>
          </SidePanelForm>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Starts</span>
                <span>{formatDate(toDateTimeLocalValue(form.watch('startsAt')))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ends</span>
                <span>{form.watch('endsAt') ? formatDate(form.watch('endsAt')) : 'No end'}</span>
              </div>
            </CardContent>
          </Card>

          {!isCreateMode && initialData ? (
            <Card>
              <CardHeader>
                <CardTitle>Danger zone</CardTitle>
                <CardDescription>
                  Deleting a price list removes its translations and price overrides.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger
                    type="button"
                    className={buttonVariants({ variant: 'destructive' })}
                  >
                    Delete price list
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete price list?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This cannot be undone. Scheduled overrides attached to this price list
                        will also be removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => deletePriceListMutation.mutate(initialData.id)}
                      >
                        {deletePriceListMutation.isPending ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </FormPageShell>
    </FormProvider>
  );
}
