import { z } from "zod";

export const languageFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or fewer")
    .regex(
      /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/,
      "Use letters, numbers, and hyphens only",
    ),
  name: z.string().trim().min(1, "Name is required"),
  // Do not use `.default(false)` here: unregistered / omitted `isDefault` would
  // be coerced to false and PUT would try to clear the store default.
  isDefault: z.boolean().optional(),
});

export type LanguageFormValues = z.infer<typeof languageFormSchema>;
