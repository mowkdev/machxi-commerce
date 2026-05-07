import { z } from "zod";

export const currencyFormSchema = z.object({
  code: z
    .string()
    .trim()
    .length(3, "Code must be exactly 3 letters")
    .regex(/^[A-Za-z]{3}$/, "Use three letters (e.g. USD)"),
  name: z.string().trim().min(1, "Name is required"),
  symbol: z.string().trim().min(1).max(8),
  decimalDigits: z.number().int().min(0).max(4),
  displayOrder: z.coerce.number().int(),
  isActive: z.boolean().optional(),
  // Do not use `.default(false)` — unregistered / omitted `isDefault` would
  // be coerced to false and PATCH would attempt to clear the store default,
  // which the server rejects.
  isDefault: z.boolean().optional(),
});

export type CurrencyFormValues = z.infer<typeof currencyFormSchema>;
