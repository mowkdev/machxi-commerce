import { Suspense } from 'react';

import { OrderConfirmation } from '@/components/checkout/order-confirmation';
import { OrderConfirmationSkeleton } from '@/components/checkout/order-confirmation-skeleton';

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderId } = await params;

  return (
    <Suspense fallback={<OrderConfirmationSkeleton />}>
      <OrderConfirmation orderId={orderId} />
    </Suspense>
  );
}
