import type { OptionDefinitionDetail, OptionValueDetail } from '@repo/types/admin';
import type {
  OptionDefinitionFormValues,
  OptionDefinitionTranslationFields,
  OptionValueFormValues,
  OptionValueTranslationFields,
} from '../schema';

// ── Option Definition ────────────────────────────────────────────────────────

export function emptyOptionDefinitionTranslation(): OptionDefinitionTranslationFields {
  return { name: '' };
}

export function buildOptionDefinitionTranslationsMap(
  data: OptionDefinitionDetail | undefined,
  fallbackLocale: string
): Record<string, OptionDefinitionTranslationFields> {
  const result: Record<string, OptionDefinitionTranslationFields> = {};
  if (data) {
    for (const t of data.translations) {
      result[t.languageCode] = { name: t.name ?? '' };
    }
  }
  if (!result[fallbackLocale]) {
    result[fallbackLocale] = emptyOptionDefinitionTranslation();
  }
  return result;
}

export function collectOptionDefinitionTranslations(values: OptionDefinitionFormValues) {
  return Object.entries(values.translations)
    .map(([languageCode, fields]) => ({
      languageCode,
      name: fields.name.trim(),
    }))
    .filter((t) => t.name.length > 0);
}

// ── Option Value ─────────────────────────────────────────────────────────────

export function emptyOptionValueTranslation(): OptionValueTranslationFields {
  return { label: '' };
}

export function buildOptionValueTranslationsMap(
  data: OptionValueDetail | undefined,
  fallbackLocale: string
): Record<string, OptionValueTranslationFields> {
  const result: Record<string, OptionValueTranslationFields> = {};
  if (data) {
    for (const t of data.translations) {
      result[t.languageCode] = { label: t.label ?? '' };
    }
  }
  if (!result[fallbackLocale]) {
    result[fallbackLocale] = emptyOptionValueTranslation();
  }
  return result;
}

export function collectOptionValueTranslations(values: OptionValueFormValues) {
  return Object.entries(values.translations)
    .map(([languageCode, fields]) => ({
      languageCode,
      label: fields.label.trim(),
    }))
    .filter((t) => t.label.length > 0);
}
