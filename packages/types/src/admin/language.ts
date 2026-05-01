import { z } from "zod";

const languageCodeInput = z
  .string()
  .trim()
  .min(1)
  .max(10)
  .regex(
    /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/,
    "Language code may contain letters, numbers, and hyphens",
  );

export const createLanguageBody = z.object({
  code: languageCodeInput,
  name: z.string().trim().min(1),
  isDefault: z.boolean().optional().default(false),
});
export type CreateLanguageBody = z.infer<typeof createLanguageBody>;

export const updateLanguageBody = z.object({
  name: z.string().trim().min(1).optional(),
  isDefault: z.boolean().optional(),
});
export type UpdateLanguageBody = z.infer<typeof updateLanguageBody>;

export const languageListItem = z.object({
  code: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LanguageListItem = z.infer<typeof languageListItem>;

export const languageDetail = languageListItem;
export type LanguageDetail = z.infer<typeof languageDetail>;
