import { z } from "zod";

export {
  createCurrencyBody,
  type CreateCurrencyBody,
  currencyCodeParam,
  currencyDetail,
  currencyListItem,
  type CurrencyCodeParam,
  type CurrencyDetail,
  type CurrencyListItem,
  updateCurrencyBody,
  type UpdateCurrencyBody,
} from "@repo/types/admin";

export const listCurrenciesQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  search: z.string().trim().min(1).optional(),
  sortBy: z
    .enum([
      "code",
      "name",
      "isActive",
      "isDefault",
      "displayOrder",
      "createdAt",
      "updatedAt",
    ])
    .default("displayOrder"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});
export type ListCurrenciesQuery = z.infer<typeof listCurrenciesQuery>;
