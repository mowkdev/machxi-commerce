import { z } from 'zod';
import { ordersUpdate } from '@repo/database/validators';

// Most order fields are immutable after creation (financials, currency,
// address snapshots). Admins may transition status and (rarely) patch
// display_id during migrations. Keep this list intentionally narrow — any
// wider mutation should go through a domain action, not a generic PATCH.

export const updateOrderStatusBody = ordersUpdate.pick({
  status: true,
});
export type UpdateOrderStatusBody = z.infer<typeof updateOrderStatusBody>;

export const listOrdersQuery = z.object({
  status: z.string().optional(),
  customerId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuery>;
