import { useAdminGetPaymentProvider } from "@repo/admin-sdk";
import type { PaymentProviderDetail } from "@repo/types/admin";

export function usePaymentProvider(id: string | undefined) {
  return useAdminGetPaymentProvider<PaymentProviderDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data,
    },
  });
}
