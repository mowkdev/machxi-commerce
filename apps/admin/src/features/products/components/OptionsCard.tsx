import { useEffect, useMemo, useState, useCallback } from 'react';
import { IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
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
import type { ProductDetailResponse } from '@repo/types/admin';
import { useGenerateVariants, useProductOptionsCatalog } from '../hooks';
import { cartesianProduct } from '../utils/variant-generator';

interface OptionsCardProps {
  product: ProductDetailResponse;
}

interface LocalOption {
  id: string;
  optionId?: string;
  code?: string;
  name: string;
  values: { id: string; valueId?: string; code?: string; label: string }[];
}

function getDefaultLangOptions(product: ProductDetailResponse): LocalOption[] {
  return product.options.map((o) => ({
    id: o.id,
    optionId: o.optionId,
    code: o.code,
    name: o.translations[0]?.name ?? '',
    values: o.values.map((v) => ({
      id: v.id,
      valueId: v.valueId,
      code: v.code,
      label: v.translations[0]?.label ?? '',
    })),
  }));
}

function normalizeOptions(options: LocalOption[]) {
  return options.map((option) => ({
    name: option.name.trim(),
    values: option.values.map((value) => value.label.trim()),
  }));
}

function getSubmittedOptions(options: LocalOption[]) {
  return options.map((option) => ({
    ...(option.optionId ? { optionId: option.optionId } : {}),
    ...(option.code ? { code: option.code } : {}),
    translations: [{ languageCode: 'en', name: option.name.trim() }],
    values: option.values.map((value) => ({
      ...(value.valueId ? { valueId: value.valueId } : {}),
      ...(value.code ? { code: value.code } : {}),
      translations: [{ languageCode: 'en', label: value.label.trim() }],
    })),
  }));
}

export function OptionsCard({ product }: OptionsCardProps) {
  const [options, setOptions] = useState<LocalOption[]>(() =>
    getDefaultLangOptions(product)
  );
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({});
  const [openOptionComboboxId, setOpenOptionComboboxId] = useState<string | null>(null);
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);
  const generateMutation = useGenerateVariants(product.id);
  const catalogQuery = useProductOptionsCatalog();
  const catalogOptions = catalogQuery.data ?? [];

  useEffect(() => {
    setOptions(getDefaultLangOptions(product));
    setNewValueInputs({});
  }, [product]);

  const handleAddOption = useCallback(() => {
    const id = `new-${Date.now()}`;
    setOptions((prev) => [
      ...prev,
      { id, name: '', values: [] },
    ]);
  }, []);

  const handleSelectCatalogOption = useCallback(
    (optionId: string, catalogOptionId: string) => {
      const catalogOption = catalogOptions.find((option) => option.id === catalogOptionId);
      if (!catalogOption) return;
      setOptions((prev) =>
        prev.map((option) =>
          option.id === optionId
            ? {
                ...option,
                optionId: catalogOption.id,
                code: catalogOption.code,
                name: catalogOption.translations[0]?.name ?? catalogOption.code,
                values: [],
              }
            : option
        )
      );
      setOpenOptionComboboxId(null);
    },
    [catalogOptions]
  );

  const handleRemoveOption = useCallback((optionId: string) => {
    setOptions((prev) =>
      prev.length <= 1 ? prev : prev.filter((o) => o.id !== optionId)
    );
  }, []);

  const handleOptionNameChange = useCallback(
    (optionId: string, name: string) => {
      setOptions((prev) =>
        prev.map((o) =>
          o.id === optionId
            ? {
                ...o,
                optionId: undefined,
                code: undefined,
                name,
                values: o.values.map((value) => ({
                  id: value.id,
                  label: value.label,
                })),
              }
            : o
        )
      );
      setOpenOptionComboboxId(optionId);
    },
    []
  );

  const handleAddValue = useCallback(
    (optionId: string, label: string) => {
      if (!label.trim()) return;
      setOptions((prev) =>
        prev.map((o) =>
          o.id === optionId
            ? {
                ...o,
                values: [
                  ...o.values,
                  { id: `new-${Date.now()}`, label: label.trim() },
                ],
              }
            : o
        )
      );
      setNewValueInputs((prev) => ({ ...prev, [optionId]: '' }));
    },
    []
  );

  const handleReuseValue = useCallback(
    (optionId: string, valueId: string) => {
      setOptions((prev) =>
        prev.map((option) => {
          if (option.id !== optionId || !option.optionId) return option;
          const catalogOption = catalogOptions.find((item) => item.id === option.optionId);
          const catalogValue = catalogOption?.values.find((value) => value.id === valueId);
          if (!catalogValue || option.values.some((value) => value.valueId === catalogValue.id)) {
            return option;
          }
          return {
            ...option,
            values: [
              ...option.values,
              {
                id: `new-${catalogValue.id}`,
                valueId: catalogValue.id,
                code: catalogValue.code,
                label: catalogValue.translations[0]?.label ?? catalogValue.code,
              },
            ],
          };
        })
      );
    },
    [catalogOptions]
  );

  const handleRemoveValue = useCallback(
    (optionId: string, valueId: string) => {
      setOptions((prev) =>
        prev.map((o) =>
          o.id === optionId
            ? { ...o, values: o.values.filter((v) => v.id !== valueId) }
            : o
        )
      );
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, optionId: string) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const value = newValueInputs[optionId] ?? '';
        handleAddValue(optionId, value);
      }
    },
    [newValueInputs, handleAddValue]
  );

  const variantCount = options.length > 0
    ? cartesianProduct(options.map((o) => o.values)).length
    : 0;
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const persistedOptions = useMemo(
    () => normalizeOptions(getDefaultLangOptions(product)),
    [product]
  );
  const optionNameCounts = normalizedOptions.reduce<Record<string, number>>(
    (counts, option) => {
      const key = option.name.toLowerCase();
      if (key) counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    },
    {}
  );
  const hasDuplicateOptionNames = normalizedOptions.some(
    (option) => option.name && optionNameCounts[option.name.toLowerCase()] > 1
  );
  const hasOptionChanges =
    JSON.stringify(normalizedOptions) !== JSON.stringify(persistedOptions);
  const canGenerateVariants =
    variantCount > 0 &&
    normalizedOptions.every((option) => option.name && option.values.length > 0) &&
    !hasDuplicateOptionNames;

  const existingVariantCount = product.variants.length;
  const shouldRegenerate = existingVariantCount > 0 && hasOptionChanges;

  const handleGenerate = (regenerate = false) => {
    generateMutation.mutate({
      defaultPrices: [
        { currencyCode: 'EUR', amount: 0, minQuantity: 1, taxInclusive: true },
      ],
      skuPrefix: product.baseSku || 'VAR',
      options: getSubmittedOptions(options),
      regenerate,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Options</CardTitle>
        <CardDescription>
          Define options like size and color to generate product variants
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {options.map((option, idx) => (
          <div key={option.id} className="flex flex-col gap-3">
            {idx > 0 && <Separator />}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">
                  Option {idx + 1}
                </Label>
                <Popover
                  open={openOptionComboboxId === option.id}
                  onOpenChange={(open) =>
                    setOpenOptionComboboxId(open ? option.id : null)
                  }
                >
                  <PopoverAnchor asChild>
                    <Input
                      value={option.name}
                      onFocus={() => setOpenOptionComboboxId(option.id)}
                      onChange={(e) =>
                        handleOptionNameChange(option.id, e.target.value)
                      }
                      placeholder="Search or create option, e.g. Color"
                      className="mt-1"
                      role="combobox"
                      aria-expanded={openOptionComboboxId === option.id}
                    />
                  </PopoverAnchor>
                  <PopoverContent
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    className="w-[var(--radix-popover-trigger-width)] p-1"
                  >
                    <div className="max-h-56 overflow-y-auto">
                      {catalogOptions
                        .filter((catalogOption) => {
                          const label =
                            catalogOption.translations[0]?.name ?? catalogOption.code;
                          return label
                            .toLowerCase()
                            .includes(option.name.trim().toLowerCase());
                        })
                        .map((catalogOption) => {
                          const label =
                            catalogOption.translations[0]?.name ?? catalogOption.code;
                          const alreadySelected = options.some(
                            (candidate) =>
                              candidate.id !== option.id &&
                              candidate.optionId === catalogOption.id
                          );
                          return (
                            <button
                              key={catalogOption.id}
                              type="button"
                              disabled={alreadySelected}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() =>
                                handleSelectCatalogOption(option.id, catalogOption.id)
                              }
                              className="flex w-full flex-col rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span>{label}</span>
                              <span className="text-xs text-muted-foreground">
                                {alreadySelected
                                  ? 'Already used on this product'
                                  : `${catalogOption.values.length} reusable value${catalogOption.values.length === 1 ? '' : 's'}`}
                              </span>
                            </button>
                          );
                        })}
                      {catalogOptions.filter((catalogOption) => {
                        const label =
                          catalogOption.translations[0]?.name ?? catalogOption.code;
                        return label
                          .toLowerCase()
                          .includes(option.name.trim().toLowerCase());
                      }).length === 0 && (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          No existing options. Continue typing to create one.
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-5 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={options.length <= 1}
                    aria-label={`Remove option ${idx + 1}`}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove option?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Removing this option may affect existing variants.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemoveOption(option.id)}
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Values</Label>
              <div className="flex flex-wrap gap-1.5">
                {option.values.map((val) => (
                  <Badge key={val.id} variant="secondary" className="gap-1 pr-1">
                    {val.label}
                    <button
                      type="button"
                      onClick={() => handleRemoveValue(option.id, val.id)}
                      className="rounded-full p-0.5 hover:bg-muted"
                    >
                      <IconX className="size-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  value={newValueInputs[option.id] ?? ''}
                  onChange={(e) =>
                    setNewValueInputs((prev) => ({
                      ...prev,
                      [option.id]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => handleKeyDown(e, option.id)}
                  onBlur={() => {
                    const val = newValueInputs[option.id] ?? '';
                    if (val.trim()) handleAddValue(option.id, val);
                  }}
                  placeholder="Add value, press Enter"
                  className="h-7 w-36 text-xs"
                />
              </div>
              {option.optionId && (
                <div className="flex flex-wrap gap-1.5">
                  {catalogOptions
                    .find((catalogOption) => catalogOption.id === option.optionId)
                    ?.values.filter(
                      (catalogValue) =>
                        !option.values.some((value) => value.valueId === catalogValue.id)
                    )
                    .map((catalogValue) => (
                      <Button
                        key={catalogValue.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleReuseValue(option.id, catalogValue.id)}
                      >
                        Add {catalogValue.translations[0]?.label ?? catalogValue.code}
                      </Button>
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOption}
            disabled={options.length >= 3}
          >
            <IconPlus className="size-4" />
            Add option
          </Button>

          {hasDuplicateOptionNames && (
            <p className="text-sm text-destructive">
              Option names must be unique.
            </p>
          )}

          {options.length > 0 && variantCount > 0 && (!existingVariantCount || shouldRegenerate) && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {variantCount} variant{variantCount === 1 ? '' : 's'}
                {existingVariantCount > 0 && ` (${existingVariantCount} existing)`}
              </span>
              {shouldRegenerate ? (
                <AlertDialog
                  open={confirmRegenerateOpen}
                  onOpenChange={setConfirmRegenerateOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      disabled={generateMutation.isPending || !canGenerateVariants}
                    >
                      {generateMutation.isPending
                        ? 'Regenerating...'
                        : 'Regenerate variants'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Regenerate variants?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Existing variants for this product will be deleted and recreated
                        from the current options.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          handleGenerate(true);
                          setConfirmRegenerateOpen(false);
                        }}
                      >
                        Regenerate variants
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleGenerate(false)}
                  disabled={generateMutation.isPending || !canGenerateVariants}
                >
                  {generateMutation.isPending ? 'Generating...' : 'Generate variants'}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
