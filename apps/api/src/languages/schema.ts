import { z } from "zod";

export {
  createLanguageBody,
  type CreateLanguageBody,
  languageDetail,
  languageListItem,
  type LanguageDetail,
  type LanguageListItem,
  updateLanguageBody,
  type UpdateLanguageBody,
} from "@repo/types/admin";

export const listLanguagesQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  sortBy: z
    .enum(["code", "name", "isDefault", "createdAt", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListLanguagesQuery = z.infer<typeof listLanguagesQuery>;

export const languageCodeParam = z.object({
  code: z.string().trim().min(1).max(10),
});
