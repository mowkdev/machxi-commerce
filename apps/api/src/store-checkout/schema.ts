import { z } from "zod";
import {
  cartIdParam,
  completeCartBody,
  placeOrderResult,
  storefrontPaymentMethod,
} from "@repo/types/storefront";

export { cartIdParam, completeCartBody, placeOrderResult, storefrontPaymentMethod };

export const storefrontPaymentMethodsEnvelope = z.array(storefrontPaymentMethod);
