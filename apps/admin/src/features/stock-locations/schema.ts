import { z } from 'zod';

export const stockLocationFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});
export type StockLocationFormValues = z.infer<typeof stockLocationFormSchema>;
