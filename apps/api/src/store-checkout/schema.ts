import { z } from "zod";
import { cartIdParam } from "@repo/types/storefront";

export { cartIdParam };

export const placeOrderResult = z.object({
  orderId: z.string().uuid(),
  displayId: z.string(),
  status: z.string(),
});
export type PlaceOrderResult = z.infer<typeof placeOrderResult>;
