import type { BadgeProps } from '@/components/ui/badge';

type StatusInfo = {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
};

const STATUS_MAP: Record<string, StatusInfo> = {
  awaiting_payment: { label: 'Awaiting payment', variant: 'outline' },
  paid: { label: 'Paid', variant: 'default' },
  processing: { label: 'Processing', variant: 'default' },
  shipped: { label: 'Shipped', variant: 'secondary' },
  delivered: { label: 'Delivered', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  refunded: { label: 'Refunded', variant: 'destructive' },
};

export function formatOrderStatus(status: string): StatusInfo {
  return STATUS_MAP[status] ?? { label: status.replace(/_/g, ' '), variant: 'outline' };
}
