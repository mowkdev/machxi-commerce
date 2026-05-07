import { Suspense } from 'react';

import { OrderConfirmation } from '@/components/checkout/order-confirmation';
import { Skeleton } from '@/components/ui/skeleton';

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderId } = await params;

  return (
    <Suspense
      fallback={<Skeleton className="mx-auto mt-24 h-48 max-w-lg rounded-xl" />}
    >
      <OrderConfirmation orderId={orderId} />
    </Suspense>
  );
}
