import type { ProductDetailResponse } from '@repo/types/admin';
import type { ProductFormValues, ProductTranslationFields } from '../schema';

export function emptyProductTranslation(): ProductTranslationFields {
  return { name: '', handle: '', description: '' };
}

export function buildProductTranslationsMap(
  data: ProductDetailResponse | undefined,
  fallbackLocale: string
): Record<string, ProductTranslationFields> {
  const result: Record<string, ProductTranslationFields> = {};
  if (data) {
    for (const t of data.translations) {
      result[t.languageCode] = {
        name: t.name ?? '',
        handle: t.handle ?? '',
        description: t.description ?? '',
      };
    }
  }
  if (!result[fallbackLocale]) {
    result[fallbackLocale] = emptyProductTranslation();
  }
  return result;
}

export function collectProductTranslations(values: ProductFormValues) {
  return Object.entries(values.translations)
    .map(([languageCode, fields]) => ({
      languageCode,
      name: fields.name.trim(),
      handle: fields.handle.trim(),
      description: fields.description ?? '',
    }))
    .filter((t) => t.name.length > 0 && t.handle.length > 0);
}
