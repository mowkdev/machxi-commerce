import { z } from 'zod';

export const taxClassFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});
export type TaxClassFormValues = z.infer<typeof taxClassFormSchema>;
