import { z } from "zod";

export const userFormSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address"),
    name: z.string().trim().max(255).optional().or(z.literal("")),
    image: z
      .string()
      .trim()
      .url("Enter a valid URL")
      .max(2048)
      .optional()
      .or(z.literal("")),
    isActive: z.boolean(),
    password: z.string().optional().or(z.literal("")),
    roleIds: z.array(z.string().uuid()),
  })
  .superRefine((data, ctx) => {
    if (
      data.password !== undefined &&
      data.password !== "" &&
      data.password.length < 12
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must be at least 12 characters",
      });
    }
  });

export type UserFormValues = z.infer<typeof userFormSchema>;
