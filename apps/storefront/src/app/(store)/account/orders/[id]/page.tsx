import { OrderDetailPage } from '@/components/account/order-detail-page';

export const metadata = { title: 'Order Detail — My Account' };

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params;
  return <OrderDetailPage orderId={id} />;
}
