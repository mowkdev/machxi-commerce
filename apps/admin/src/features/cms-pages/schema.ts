import { z } from 'zod';

export const pageTranslationFieldsSchema = z.object({
  title: z.string(),
  handle: z.string(),
  metaTitle: z.string().optional().default(''),
  metaDescription: z.string().optional().default(''),
});
export type PageTranslationFields = z.infer<typeof pageTranslationFieldsSchema>;

export const pageFormSchema = z.object({
  parentId: z.string().uuid().nullable(),
  status: z.enum(['draft', 'published', 'archived']),
  templateKey: z.string().nullable().optional(),
  translations: z.record(z.string(), pageTranslationFieldsSchema),
});
export type PageFormValues = z.infer<typeof pageFormSchema>;

export function emptyPageTranslation(): PageTranslationFields {
  return { title: '', handle: '', metaTitle: '', metaDescription: '' };
}
