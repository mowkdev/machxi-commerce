import { z } from "zod";

export const roleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or fewer")
    .optional()
    .or(z.literal("")),
  permissionIds: z.array(z.string().uuid()),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;
