import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { OptionCatalogOption, ProductDetailResponse } from '@repo/types/admin';
import { useGenerateVariants, useProductOptionsCatalog } from '../hooks';
import {
  getDefaultLangOptions,
  getSubmittedOptions,
  hasDuplicateOptionNames,
  type LocalOption,
  normalizeOptions,
} from '../utils/options-form';
import { cartesianProduct } from '../utils/variant-generator';

export function useProductOptionsEditor(product: ProductDetailResponse) {
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
    setOptions((prev) => [...prev, { id, name: '', values: [] }]);
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

  const handleOptionNameChange = useCallback((optionId: string, name: string) => {
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
  }, []);

  const handleAddValue = useCallback((optionId: string, label: string) => {
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
  }, []);

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

  const handleRemoveValue = useCallback((optionId: string, valueId: string) => {
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optionId
          ? { ...o, values: o.values.filter((v) => v.id !== valueId) }
          : o
      )
    );
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, optionId: string) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const value = newValueInputs[optionId] ?? '';
        handleAddValue(optionId, value);
      }
    },
    [newValueInputs, handleAddValue]
  );

  const variantCount =
    options.length > 0 ? cartesianProduct(options.map((o) => o.values)).length : 0;
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const persistedOptions = useMemo(
    () => normalizeOptions(getDefaultLangOptions(product)),
    [product]
  );
  const duplicateOptionNames = hasDuplicateOptionNames(normalizedOptions);
  const hasOptionChanges =
    JSON.stringify(normalizedOptions) !== JSON.stringify(persistedOptions);
  const canGenerateVariants =
    variantCount > 0 &&
    normalizedOptions.every((option) => option.name && option.values.length > 0) &&
    !duplicateOptionNames;
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

  const getMatchingCatalogOptions = (option: LocalOption) =>
    catalogOptions.filter((catalogOption) =>
      getCatalogOptionLabel(catalogOption)
        .toLowerCase()
        .includes(option.name.trim().toLowerCase())
    );

  const getUnusedCatalogValues = (option: LocalOption) =>
    catalogOptions
      .find((catalogOption) => catalogOption.id === option.optionId)
      ?.values.filter(
        (catalogValue) =>
          !option.values.some((value) => value.valueId === catalogValue.id)
      ) ?? [];

  return {
    canGenerateVariants,
    catalogOptions,
    confirmRegenerateOpen,
    existingVariantCount,
    generateMutation,
    getMatchingCatalogOptions,
    getUnusedCatalogValues,
    handleAddOption,
    handleAddValue,
    handleGenerate,
    handleKeyDown,
    handleOptionNameChange,
    handleRemoveOption,
    handleRemoveValue,
    handleReuseValue,
    handleSelectCatalogOption,
    hasDuplicateOptionNames: duplicateOptionNames,
    newValueInputs,
    openOptionComboboxId,
    options,
    setConfirmRegenerateOpen,
    setNewValueInputs,
    setOpenOptionComboboxId,
    shouldRegenerate,
    variantCount,
  };
}

function getCatalogOptionLabel(option: OptionCatalogOption) {
  return option.translations[0]?.name ?? option.code;
}
