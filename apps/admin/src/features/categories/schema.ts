import { z } from 'zod';

export const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  handle: z.string().min(1, 'Handle is required'),
  description: z.string().optional(),
  parentId: z.string().uuid().nullable(),
  isActive: z.boolean(),
  rank: z.number().int().nonnegative('Rank must be zero or greater'),
});
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
