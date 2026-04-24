import { z } from 'zod';

// Kept in-app (rather than importing from @repo/types/admin) so the UI can
// surface friendlier client-side messages without loosening server validation.
export const loginFormSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
