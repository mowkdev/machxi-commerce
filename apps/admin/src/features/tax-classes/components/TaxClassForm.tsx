import { useMemo, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { FormPageShell } from '@/components/form-page-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TaxClassDetail, TaxRateDetail } from '@repo/types/admin';
import {
  useCreateTaxRate,
  useDeleteTaxClass,
  useDeleteTaxRate,
  useUpdateTaxRate,
} from '../hooks';
import { useTaxClassForm } from '../hooks/useTaxClassForm';
import {
  normalizeTaxRateFormValues,
  taxRateFormSchema,
  type TaxRateFormValues,
} from '../schema';

interface TaxClassFormProps {
  mode: 'create' | 'edit';
  initialData?: TaxClassDetail;
}

const emptyRateFormValues: TaxRateFormValues = {
  countryCode: '',
  provinceCode: '',
  rate: '',
  startsAt: '',
  endsAt: '',
};

function toDateTimeLocalValue(value: string | null | undefined) {
  return value ? value.slice(0, 16) : '';
}

function rateToFormValues(rate: TaxRateDetail): TaxRateFormValues {
  return {
    countryCode: rate.countryCode,
    provinceCode: rate.provinceCode ?? '',
    rate: rate.rate,
    startsAt: toDateTimeLocalValue(rate.startsAt),
    endsAt: toDateTimeLocalValue(rate.endsAt),
  };
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : 'Always';
}

export function TaxClassForm({ mode, initialData }: TaxClassFormProps) {
  const [rateDraft, setRateDraft] =
    useState<TaxRateFormValues>(emptyRateFormValues);
  const [editingRate, setEditingRate] = useState<TaxRateDetail | null>(null);
  const [rateErrors, setRateErrors] = useState<Record<string, string>>({});
  const [isRateFormOpen, setIsRateFormOpen] = useState(false);
  const createRateMutation = useCreateTaxRate(initialData?.id ?? '');
  const updateRateMutation = useUpdateTaxRate(initialData?.id ?? '');
  const deleteRateMutation = useDeleteTaxRate(initialData?.id ?? '');
  const deleteTaxClassMutation = useDeleteTaxClass();
  const {
    form,
    isCreateMode,
    isEditMode,
    isPending,
    navigateToTaxClasses,
    onSubmit,
    title,
  } = useTaxClassForm({ mode, initialData });
  const rates = useMemo(() => initialData?.rates ?? [], [initialData?.rates]);
  const isRateMutationPending =
    createRateMutation.isPending || updateRateMutation.isPending;

  const openNewRateForm = () => {
    setEditingRate(null);
    setRateDraft(emptyRateFormValues);
    setRateErrors({});
    setIsRateFormOpen(true);
  };

  const openEditRateForm = (rate: TaxRateDetail) => {
    setEditingRate(rate);
    setRateDraft(rateToFormValues(rate));
    setRateErrors({});
    setIsRateFormOpen(true);
  };

  const closeRateForm = () => {
    setEditingRate(null);
    setRateDraft(emptyRateFormValues);
    setRateErrors({});
    setIsRateFormOpen(false);
  };

  const updateRateDraft = (field: keyof TaxRateFormValues, value: string) => {
    setRateDraft((current) => ({ ...current, [field]: value }));
  };

  const saveRate = () => {
    if (!initialData) return;

    const result = taxRateFormSchema.safeParse(rateDraft);
    if (!result.success) {
      setRateErrors(
        result.error.issues.reduce<Record<string, string>>((acc, issue) => {
          const key = String(issue.path[0]);
          acc[key] = issue.message;
          return acc;
        }, {})
      );
      return;
    }

    const body = normalizeTaxRateFormValues(result.data);
    if (editingRate) {
      updateRateMutation.mutate(
        { rateId: editingRate.id, body },
        { onSuccess: closeRateForm }
      );
    } else {
      createRateMutation.mutate(body, { onSuccess: closeRateForm });
    }
  };

  return (
    <FormProvider {...form}>
      <FormPageShell
        title={title}
        onBack={navigateToTaxClasses}
        onSubmit={onSubmit}
        submitLabel={isPending ? 'Saving...' : isCreateMode ? 'Create' : 'Save'}
        isSubmitting={isPending}
        contentClassName="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 lg:p-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  placeholder="e.g. Standard, Reduced, Zero-rated"
                  {...form.register('name')}
                />
                <FieldError errors={[form.formState.errors.name]} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Rates</CardTitle>
                <CardDescription>
                  Configure regional tax percentages and optional effective dates.
                </CardDescription>
              </div>
              {isEditMode && initialData ? (
                <Button type="button" size="sm" onClick={openNewRateForm}>
                  Add rate
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCreateMode ? (
              <p className="text-sm text-muted-foreground">
                Create the tax class before adding regional rates.
              </p>
            ) : null}
            {isEditMode && rates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rates have been configured yet.
              </p>
            ) : null}
            {isEditMode && rates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Starts</TableHead>
                    <TableHead>Ends</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell>
                        <span className="font-medium">{rate.countryCode}</span>
                        {rate.provinceCode ? (
                          <span className="text-muted-foreground">
                            {' '}
                            / {rate.provinceCode}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>{rate.rate}%</TableCell>
                      <TableCell>{formatDate(rate.startsAt)}</TableCell>
                      <TableCell>
                        {rate.endsAt ? formatDate(rate.endsAt) : 'No end'}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditRateForm(rate)}
                          >
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger
                              type="button"
                              className={buttonVariants({
                                variant: 'destructive',
                                size: 'sm',
                              })}
                            >
                              Delete
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete tax rate?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This removes the rate for {rate.countryCode}
                                  {rate.provinceCode
                                    ? ` / ${rate.provinceCode}`
                                    : ''}{' '}
                                  from this tax class.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  variant="destructive"
                                  onClick={() => deleteRateMutation.mutate(rate.id)}
                                >
                                  {deleteRateMutation.isPending
                                    ? 'Deleting...'
                                    : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
            {isRateFormOpen ? (
              <div className="rounded-lg border p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-medium">
                    {editingRate ? 'Edit rate' : 'Add rate'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Country codes are normalized to uppercase when saved.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="rate-country">Country</FieldLabel>
                    <Input
                      id="rate-country"
                      value={rateDraft.countryCode}
                      onChange={(event) =>
                        updateRateDraft('countryCode', event.target.value)
                      }
                      placeholder="US"
                    />
                    <FieldError
                      errors={[{ message: rateErrors.countryCode }]}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="rate-province">Province</FieldLabel>
                    <Input
                      id="rate-province"
                      value={rateDraft.provinceCode}
                      onChange={(event) =>
                        updateRateDraft('provinceCode', event.target.value)
                      }
                      placeholder="CA"
                    />
                    <FieldError
                      errors={[{ message: rateErrors.provinceCode }]}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="rate-rate">Rate %</FieldLabel>
                    <Input
                      id="rate-rate"
                      value={rateDraft.rate}
                      onChange={(event) =>
                        updateRateDraft('rate', event.target.value)
                      }
                      placeholder="20"
                    />
                    <FieldError errors={[{ message: rateErrors.rate }]} />
                  </Field>
                  <div />
                  <Field>
                    <FieldLabel htmlFor="rate-starts-at">Starts at</FieldLabel>
                    <Input
                      id="rate-starts-at"
                      type="datetime-local"
                      value={rateDraft.startsAt}
                      onChange={(event) =>
                        updateRateDraft('startsAt', event.target.value)
                      }
                    />
                    <FieldError errors={[{ message: rateErrors.startsAt }]} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="rate-ends-at">Ends at</FieldLabel>
                    <Input
                      id="rate-ends-at"
                      type="datetime-local"
                      value={rateDraft.endsAt}
                      onChange={(event) =>
                        updateRateDraft('endsAt', event.target.value)
                      }
                    />
                    <FieldError errors={[{ message: rateErrors.endsAt }]} />
                  </Field>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeRateForm}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={saveRate}
                    disabled={isRateMutationPending}
                  >
                    {isRateMutationPending ? 'Saving...' : 'Save rate'}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
        {!isCreateMode && initialData ? (
          <Card>
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>
                Delete this tax class only if it is not referenced by products,
                shipping, or tax rates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger
                  type="button"
                  className={buttonVariants({ variant: 'destructive' })}
                >
                  Delete tax class
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete tax class?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This cannot be undone. Classes used by products, shipping,
                      or configured rates cannot be deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => deleteTaxClassMutation.mutate(initialData.id)}
                    >
                      {deleteTaxClassMutation.isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ) : null}
      </FormPageShell>
    </FormProvider>
  );
}
