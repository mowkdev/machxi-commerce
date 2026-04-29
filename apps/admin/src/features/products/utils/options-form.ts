import type { ProductDetailResponse } from '@repo/types/admin';

export interface LocalOption {
  id: string;
  optionId?: string;
  code?: string;
  name: string;
  values: { id: string; valueId?: string; code?: string; label: string }[];
}

export function getDefaultLangOptions(product: ProductDetailResponse): LocalOption[] {
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

export function normalizeOptions(options: LocalOption[]) {
  return options.map((option) => ({
    name: option.name.trim(),
    values: option.values.map((value) => value.label.trim()),
  }));
}

export function getSubmittedOptions(options: LocalOption[]) {
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

export function hasDuplicateOptionNames(options: ReturnType<typeof normalizeOptions>) {
  const optionNameCounts = options.reduce<Record<string, number>>((counts, option) => {
    const key = option.name.toLowerCase();
    if (key) counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  return options.some(
    (option) => option.name && optionNameCounts[option.name.toLowerCase()] > 1
  );
}
