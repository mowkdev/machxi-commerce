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
import type {
  PromotionAmount,
  PromotionDetail,
  PromotionTarget,
  PromotionTranslation,
} from '@repo/types/admin';
import {
  useCreatePromotionAmount,
  useCreatePromotionTarget,
  useCreatePromotionTranslation,
  useDeletePromotion,
  useDeletePromotionAmount,
  useDeletePromotionTarget,
  useDeletePromotionTranslation,
  usePromotionCategoryTargets,
  usePromotionProductTargets,
  useUpdatePromotionAmount,
  useUpdatePromotionTarget,
  useUpdatePromotionTranslation,
} from '../hooks';
import { usePromotionForm } from '../hooks/usePromotionForm';
import {
  normalizePromotionAmountValues,
  normalizePromotionTargetValues,
  normalizePromotionTranslationValues,
  promotionAmountFormSchema,
  promotionTargetFormSchema,
  promotionTranslationFormSchema,
  type PromotionAmountFormInput,
  type PromotionTargetFormInput,
  type PromotionTranslationFormInput,
} from '../schema';

interface PromotionFormProps {
  mode: 'create' | 'edit';
  initialData?: PromotionDetail;
}

const emptyAmountDraft: PromotionAmountFormInput = {
  currencyCode: 'USD',
  amount: '',
};

const emptyTargetDraft: PromotionTargetFormInput = {
  targetType: 'product',
  targetId: '',
};

const emptyTranslationDraft: PromotionTranslationFormInput = {
  languageCode: 'en',
  displayName: '',
  terms: '',
};

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : 'Always';
}

function formatAmount(amount: number, currencyCode: string) {
  return `${amount.toLocaleString()} ${currencyCode}`;
}

function amountToDraft(amount: PromotionAmount): PromotionAmountFormInput {
  return {
    currencyCode: amount.currencyCode,
    amount: String(amount.amount),
  };
}

function targetToDraft(target: PromotionTarget): PromotionTargetFormInput {
  return {
    targetType: target.targetType,
    targetId: target.productId ?? target.categoryId ?? '',
  };
}

function translationToDraft(translation: PromotionTranslation): PromotionTranslationFormInput {
  return {
    languageCode: translation.languageCode,
    displayName: translation.displayName,
    terms: translation.terms ?? '',
  };
}

function fieldError(message: string | undefined) {
  return message ? [{ message }] : [];
}

export function PromotionForm({ mode, initialData }: PromotionFormProps) {
  const [amountDraft, setAmountDraft] = useState<PromotionAmountFormInput>(emptyAmountDraft);
  const [editingAmount, setEditingAmount] = useState<PromotionAmount | null>(null);
  const [amountErrors, setAmountErrors] = useState<Record<string, string>>({});
  const [isAmountFormOpen, setIsAmountFormOpen] = useState(false);

  const [targetDraft, setTargetDraft] = useState<PromotionTargetFormInput>(emptyTargetDraft);
  const [editingTarget, setEditingTarget] = useState<PromotionTarget | null>(null);
  const [targetErrors, setTargetErrors] = useState<Record<string, string>>({});
  const [isTargetFormOpen, setIsTargetFormOpen] = useState(false);

  const [translationDraft, setTranslationDraft] =
    useState<PromotionTranslationFormInput>(emptyTranslationDraft);
  const [editingTranslation, setEditingTranslation] = useState<PromotionTranslation | null>(null);
  const [translationErrors, setTranslationErrors] = useState<Record<string, string>>({});
  const [isTranslationFormOpen, setIsTranslationFormOpen] = useState(false);

  const { data: productTargets = [] } = usePromotionProductTargets();
  const { data: categoryTargets = [] } = usePromotionCategoryTargets();
  const createAmountMutation = useCreatePromotionAmount(initialData?.id ?? '');
  const updateAmountMutation = useUpdatePromotionAmount(initialData?.id ?? '');
  const deleteAmountMutation = useDeletePromotionAmount(initialData?.id ?? '');
  const createTargetMutation = useCreatePromotionTarget(initialData?.id ?? '');
  const updateTargetMutation = useUpdatePromotionTarget(initialData?.id ?? '');
  const deleteTargetMutation = useDeletePromotionTarget(initialData?.id ?? '');
  const createTranslationMutation = useCreatePromotionTranslation(initialData?.id ?? '');
  const updateTranslationMutation = useUpdatePromotionTranslation(initialData?.id ?? '');
  const deleteTranslationMutation = useDeletePromotionTranslation(initialData?.id ?? '');
  const deletePromotionMutation = useDeletePromotion();

  const {
    form,
    isCreateMode,
    isEditMode,
    isPending,
    navigateToPromotions,
    onSubmit,
    title,
  } = usePromotionForm({ mode, initialData });

  const type = form.watch('type');
  const amounts = useMemo(() => initialData?.amounts ?? [], [initialData?.amounts]);
  const targets = useMemo(() => initialData?.targets ?? [], [initialData?.targets]);
  const translations = useMemo(
    () => initialData?.translations ?? [],
    [initialData?.translations]
  );
  const currentTargetOptions =
    targetDraft.targetType === 'product' ? productTargets : categoryTargets;

  const openNewAmountForm = () => {
    setEditingAmount(null);
    setAmountDraft(emptyAmountDraft);
    setAmountErrors({});
    setIsAmountFormOpen(true);
  };

  const openEditAmountForm = (amount: PromotionAmount) => {
    setEditingAmount(amount);
    setAmountDraft(amountToDraft(amount));
    setAmountErrors({});
    setIsAmountFormOpen(true);
  };

  const closeAmountForm = () => {
    setEditingAmount(null);
    setAmountDraft(emptyAmountDraft);
    setAmountErrors({});
    setIsAmountFormOpen(false);
  };

  const saveAmount = () => {
    const result = promotionAmountFormSchema.safeParse(amountDraft);
    if (!result.success) {
      setAmountErrors(
        result.error.issues.reduce<Record<string, string>>((acc, issue) => {
          acc[String(issue.path[0])] = issue.message;
          return acc;
        }, {})
      );
      return;
    }

    const body = normalizePromotionAmountValues(amountDraft);
    if (editingAmount) {
      updateAmountMutation.mutate(
        { amountId: editingAmount.id, body },
        { onSuccess: closeAmountForm }
      );
    } else {
      createAmountMutation.mutate(body, { onSuccess: closeAmountForm });
    }
  };

  const openNewTargetForm = () => {
    const firstTarget = productTargets[0];
    setEditingTarget(null);
    setTargetDraft({ targetType: 'product', targetId: firstTarget?.id ?? '' });
    setTargetErrors({});
    setIsTargetFormOpen(true);
  };

  const openEditTargetForm = (target: PromotionTarget) => {
    setEditingTarget(target);
    setTargetDraft(targetToDraft(target));
    setTargetErrors({});
    setIsTargetFormOpen(true);
  };

  const closeTargetForm = () => {
    setEditingTarget(null);
    setTargetDraft(emptyTargetDraft);
    setTargetErrors({});
    setIsTargetFormOpen(false);
  };

  const selectTargetType = (targetType: PromotionTargetFormInput['targetType']) => {
    const firstTarget = targetType === 'product' ? productTargets[0] : categoryTargets[0];
    setTargetDraft({ targetType, targetId: firstTarget?.id ?? '' });
  };

  const saveTarget = () => {
    const result = promotionTargetFormSchema.safeParse(targetDraft);
    if (!result.success) {
      setTargetErrors(
        result.error.issues.reduce<Record<string, string>>((acc, issue) => {
          acc[String(issue.path[0])] = issue.message;
          return acc;
        }, {})
      );
      return;
    }

    const body = normalizePromotionTargetValues(targetDraft);
    if (editingTarget) {
      updateTargetMutation.mutate(
        { targetId: editingTarget.id, body },
        { onSuccess: closeTargetForm }
      );
    } else {
      createTargetMutation.mutate(body, { onSuccess: closeTargetForm });
    }
  };

  const openNewTranslationForm = () => {
    setEditingTranslation(null);
    setTranslationDraft(emptyTranslationDraft);
    setTranslationErrors({});
    setIsTranslationFormOpen(true);
  };

  const openEditTranslationForm = (translation: PromotionTranslation) => {
    setEditingTranslation(translation);
    setTranslationDraft(translationToDraft(translation));
    setTranslationErrors({});
    setIsTranslationFormOpen(true);
  };

  const closeTranslationForm = () => {
    setEditingTranslation(null);
    setTranslationDraft(emptyTranslationDraft);
    setTranslationErrors({});
    setIsTranslationFormOpen(false);
  };

  const saveTranslation = () => {
    const result = promotionTranslationFormSchema.safeParse(translationDraft);
    if (!result.success) {
      setTranslationErrors(
        result.error.issues.reduce<Record<string, string>>((acc, issue) => {
          acc[String(issue.path[0])] = issue.message;
          return acc;
        }, {})
      );
      return;
    }

    const body = normalizePromotionTranslationValues(translationDraft);
    if (editingTranslation) {
      updateTranslationMutation.mutate(
        { translationId: editingTranslation.id, body },
        { onSuccess: closeTranslationForm }
      );
    } else {
      createTranslationMutation.mutate(body, { onSuccess: closeTranslationForm });
    }
  };

  return (
    <FormProvider {...form}>
      <FormPageShell
        title={title}
        onBack={navigateToPromotions}
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
                Configure the promotion code, discount type, and customer-facing label.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="code">Code</FieldLabel>
                  <Input id="code" placeholder="WELCOME10" {...form.register('code')} />
                  <FieldError errors={[form.formState.errors.code]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="displayName">Display name</FieldLabel>
                  <Input
                    id="displayName"
                    placeholder="Welcome discount"
                    {...form.register('displayName')}
                  />
                  <FieldError errors={[form.formState.errors.displayName]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="terms">Terms</FieldLabel>
                  <Controller
                    control={form.control}
                    name="terms"
                    render={({ field: { ref: _ref, ...field } }) => (
                      <Textarea id="terms" placeholder="Optional terms" {...field} />
                    )}
                  />
                  <FieldError errors={[form.formState.errors.terms]} />
                </Field>
                <Field>
                  <FieldLabel>Type</FieldLabel>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed_amount">Fixed amount</SelectItem>
                          <SelectItem value="free_shipping">Free shipping</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[form.formState.errors.type]} />
                </Field>
                {type === 'percentage' ? (
                  <Field>
                    <FieldLabel htmlFor="percentageValue">Percentage value</FieldLabel>
                    <Input
                      id="percentageValue"
                      inputMode="decimal"
                      placeholder="10"
                      {...form.register('percentageValue')}
                    />
                    <FieldError errors={[form.formState.errors.percentageValue]} />
                  </Field>
                ) : null}
                {isCreateMode && type === 'fixed_amount' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="fixedCurrencyCode">Currency</FieldLabel>
                      <Input
                        id="fixedCurrencyCode"
                        placeholder="USD"
                        {...form.register('fixedCurrencyCode')}
                      />
                      <FieldError errors={[form.formState.errors.fixedCurrencyCode]} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="fixedAmount">Amount</FieldLabel>
                      <Input
                        id="fixedAmount"
                        inputMode="numeric"
                        placeholder="500"
                        {...form.register('fixedAmount')}
                      />
                      <FieldError errors={[form.formState.errors.fixedAmount]} />
                    </Field>
                  </div>
                ) : null}
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eligibility</CardTitle>
              <CardDescription>Dates, usage caps, and minimum cart requirements.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="startsAt">Starts</FieldLabel>
                    <Input id="startsAt" type="datetime-local" {...form.register('startsAt')} />
                    <FieldError errors={[form.formState.errors.startsAt]} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="expiresAt">Expires</FieldLabel>
                    <Input id="expiresAt" type="datetime-local" {...form.register('expiresAt')} />
                    <FieldError errors={[form.formState.errors.expiresAt]} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="usageLimit">Usage limit</FieldLabel>
                    <Input id="usageLimit" inputMode="numeric" {...form.register('usageLimit')} />
                    <FieldError errors={[form.formState.errors.usageLimit]} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="usageLimitPerCustomer">Per-customer limit</FieldLabel>
                    <Input
                      id="usageLimitPerCustomer"
                      inputMode="numeric"
                      {...form.register('usageLimitPerCustomer')}
                    />
                    <FieldError errors={[form.formState.errors.usageLimitPerCustomer]} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="minCartAmount">Minimum cart amount</FieldLabel>
                    <Input
                      id="minCartAmount"
                      inputMode="numeric"
                      {...form.register('minCartAmount')}
                    />
                    <FieldError errors={[form.formState.errors.minCartAmount]} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="minCartQuantity">Minimum cart quantity</FieldLabel>
                    <Input
                      id="minCartQuantity"
                      inputMode="numeric"
                      {...form.register('minCartQuantity')}
                    />
                    <FieldError errors={[form.formState.errors.minCartQuantity]} />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          {isEditMode ? (
            <>
              {initialData?.type === 'fixed_amount' ? (
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle>Amounts ({amounts.length})</CardTitle>
                      <CardDescription>Currency-specific fixed discounts.</CardDescription>
                    </div>
                    <Button type="button" size="sm" onClick={openNewAmountForm}>
                      Add amount
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Currency</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {amounts.map((amount) => (
                          <TableRow
                            key={amount.id}
                            className="cursor-pointer"
                            onClick={() => openEditAmountForm(amount)}
                          >
                            <TableCell>{amount.currencyCode}</TableCell>
                            <TableCell>{formatAmount(amount.amount, amount.currencyCode)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Targets ({targets.length})</CardTitle>
                    <CardDescription>
                      Empty targets make this promotion available globally.
                    </CardDescription>
                  </div>
                  <Button type="button" size="sm" onClick={openNewTargetForm}>
                    Add target
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Target</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {targets.map((target) => (
                        <TableRow
                          key={target.id}
                          className="cursor-pointer"
                          onClick={() => openEditTargetForm(target)}
                        >
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {target.targetType}
                            </Badge>
                          </TableCell>
                          <TableCell>{target.targetName ?? target.productId ?? target.categoryId}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Translations ({translations.length})</CardTitle>
                    <CardDescription>Localized promotion labels and terms.</CardDescription>
                  </div>
                  <Button type="button" size="sm" onClick={openNewTranslationForm}>
                    Add translation
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Language</TableHead>
                        <TableHead>Display name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {translations.map((translation) => (
                        <TableRow
                          key={translation.id}
                          className="cursor-pointer"
                          onClick={() => openEditTranslationForm(translation)}
                        >
                          <TableCell>{translation.languageCode}</TableCell>
                          <TableCell>{translation.displayName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Schedule</span>
                <span className="text-right">
                  {formatDate(form.watch('startsAt'))} to {formatDate(form.watch('expiresAt'))}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Scope</span>
                <span>{targets.length === 0 ? 'Global' : `${targets.length} targets`}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Discount</span>
                <span className="capitalize">{type.replace('_', ' ')}</span>
              </div>
            </CardContent>
          </Card>

          {isEditMode && initialData ? (
            <Card>
              <CardHeader>
                <CardTitle>Danger zone</CardTitle>
                <CardDescription>Delete this promotion and its configuration.</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger
                    type="button"
                    className={buttonVariants({ variant: 'destructive', className: 'w-full' })}
                  >
                    Delete promotion
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete promotion?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This cannot be undone. Promotions with usage history may be protected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className={buttonVariants({ variant: 'destructive' })}
                        onClick={() => deletePromotionMutation.mutate(initialData.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </FormPageShell>

      <SidePanelForm
        open={isAmountFormOpen}
        onOpenChange={setIsAmountFormOpen}
        title={editingAmount ? 'Edit amount' : 'Add amount'}
        formId="promotion-amount-form"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          saveAmount();
        }}
        submitLabel={editingAmount ? 'Save amount' : 'Add amount'}
        isSubmitting={createAmountMutation.isPending || updateAmountMutation.isPending}
      >
        <Field>
          <FieldLabel htmlFor="amountCurrencyCode">Currency</FieldLabel>
          <Input
            id="amountCurrencyCode"
            value={amountDraft.currencyCode}
            onChange={(event) =>
              setAmountDraft((current) => ({ ...current, currencyCode: event.target.value }))
            }
          />
          <FieldError errors={fieldError(amountErrors.currencyCode)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="amountValue">Amount</FieldLabel>
          <Input
            id="amountValue"
            inputMode="numeric"
            value={String(amountDraft.amount)}
            onChange={(event) =>
              setAmountDraft((current) => ({ ...current, amount: event.target.value }))
            }
          />
          <FieldError errors={fieldError(amountErrors.amount)} />
        </Field>
        {editingAmount ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() =>
              deleteAmountMutation.mutate(editingAmount.id, { onSuccess: closeAmountForm })
            }
          >
            Delete amount
          </Button>
        ) : null}
      </SidePanelForm>

      <SidePanelForm
        open={isTargetFormOpen}
        onOpenChange={setIsTargetFormOpen}
        title={editingTarget ? 'Edit target' : 'Add target'}
        formId="promotion-target-form"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          saveTarget();
        }}
        submitLabel={editingTarget ? 'Save target' : 'Add target'}
        isSubmitting={createTargetMutation.isPending || updateTargetMutation.isPending}
      >
        <Field>
          <FieldLabel>Target type</FieldLabel>
          <Select value={targetDraft.targetType} onValueChange={selectTargetType}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Target</FieldLabel>
          <Select
            value={targetDraft.targetId}
            onValueChange={(targetId) =>
              setTargetDraft((current) => ({ ...current, targetId }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select target" />
            </SelectTrigger>
            <SelectContent>
              {currentTargetOptions.map((target) => (
                <SelectItem key={target.id} value={target.id}>
                  {'name' in target ? target.name ?? target.id : target.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={fieldError(targetErrors.targetId)} />
        </Field>
        {editingTarget ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() =>
              deleteTargetMutation.mutate(editingTarget.id, { onSuccess: closeTargetForm })
            }
          >
            Delete target
          </Button>
        ) : null}
      </SidePanelForm>

      <SidePanelForm
        open={isTranslationFormOpen}
        onOpenChange={setIsTranslationFormOpen}
        title={editingTranslation ? 'Edit translation' : 'Add translation'}
        formId="promotion-translation-form"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          saveTranslation();
        }}
        submitLabel={editingTranslation ? 'Save translation' : 'Add translation'}
        isSubmitting={createTranslationMutation.isPending || updateTranslationMutation.isPending}
      >
        <Field>
          <FieldLabel htmlFor="translationLanguageCode">Language code</FieldLabel>
          <Input
            id="translationLanguageCode"
            value={translationDraft.languageCode}
            onChange={(event) =>
              setTranslationDraft((current) => ({ ...current, languageCode: event.target.value }))
            }
          />
          <FieldError errors={fieldError(translationErrors.languageCode)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="translationDisplayName">Display name</FieldLabel>
          <Input
            id="translationDisplayName"
            value={translationDraft.displayName}
            onChange={(event) =>
              setTranslationDraft((current) => ({ ...current, displayName: event.target.value }))
            }
          />
          <FieldError errors={fieldError(translationErrors.displayName)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="translationTerms">Terms</FieldLabel>
          <Textarea
            id="translationTerms"
            value={translationDraft.terms}
            onChange={(event) =>
              setTranslationDraft((current) => ({ ...current, terms: event.target.value }))
            }
          />
        </Field>
        {editingTranslation ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() =>
              deleteTranslationMutation.mutate(editingTranslation.id, {
                onSuccess: closeTranslationForm,
              })
            }
          >
            Delete translation
          </Button>
        ) : null}
      </SidePanelForm>
    </FormProvider>
  );
}
