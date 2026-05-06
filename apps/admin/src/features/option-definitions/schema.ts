import { z } from 'zod';

export const optionDefinitionTranslationFieldsSchema = z.object({
  name: z.string(),
});
export type OptionDefinitionTranslationFields = z.infer<typeof optionDefinitionTranslationFieldsSchema>;

export const optionDefinitionFormSchema = z.object({
  code: z.string().min(1, 'Code is required').max(128),
  translations: z.record(z.string(), optionDefinitionTranslationFieldsSchema),
});
export type OptionDefinitionFormValues = z.infer<typeof optionDefinitionFormSchema>;

export const optionValueTranslationFieldsSchema = z.object({
  label: z.string(),
});
export type OptionValueTranslationFields = z.infer<typeof optionValueTranslationFieldsSchema>;

export const optionValueFormSchema = z.object({
  code: z.string().min(1, 'Code is required').max(128),
  translations: z.record(z.string(), optionValueTranslationFieldsSchema),
});
export type OptionValueFormValues = z.infer<typeof optionValueFormSchema>;
