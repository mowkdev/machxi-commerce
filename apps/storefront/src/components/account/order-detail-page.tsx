'use client';

import Link from 'next/link';
import { useStoreGetMyOrder } from '@repo/storefront-sdk';
import { ArrowLeft, Package } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatMoney } from '@/lib/format-money';
import { formatOrderStatus } from '@/lib/order-helpers';

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const { data, isLoading } = useStoreGetMyOrder(orderId, {
    query: { retry: 1 },
  });
  const formatMoney = useFormatMoney();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data?.success) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Order not found.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/account/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  const order = data.data;
  const { label, variant } = formatOrderStatus(order.status);
  const cc = order.currencyCode;
  const shipping = order.shippingAddressSnapshot as Record<string, string> | null;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/account/orders">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to orders
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {order.displayId}
          </h1>
          <Badge variant={variant}>{label}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Placed on {new Date(order.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Items */}
      <div className="rounded-lg border">
        <div className="border-b bg-muted/50 px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            Items
          </h2>
        </div>
        <ul className="divide-y">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="h-14 w-14 shrink-0 rounded-md border object-cover"
                />
              ) : (
                <div className="h-14 w-14 shrink-0 rounded-md border bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {item.title}
                  {item.variantTitle ? (
                    <span className="font-normal text-muted-foreground">
                      {' '}— {item.variantTitle}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatMoney(item.finalUnitPrice, cc)} x {item.quantity}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium">
                {formatMoney(item.finalUnitPrice * item.quantity, cc)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Summary + address side-by-side on desktop */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Totals */}
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-medium">Order summary</h2>
          <div className="space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatMoney(order.subtotal, cc)} />
            {order.discountTotal > 0 && (
              <Row
                label="Discounts"
                value={`-${formatMoney(order.discountTotal, cc)}`}
                className="text-green-600"
              />
            )}
            <Row label="Shipping" value={formatMoney(order.shippingTotal, cc)} />
            <Row label="Tax" value={formatMoney(order.taxTotal, cc)} />
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>{formatMoney(order.totalAmount, cc)}</span>
          </div>
        </div>

        {/* Shipping address */}
        {shipping && (
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">Shipping address</h2>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {shipping.firstName} {shipping.lastName}
              </p>
              <p>{shipping.addressLine1}</p>
              {shipping.addressLine2 ? <p>{shipping.addressLine2}</p> : null}
              <p>
                {shipping.city}, {shipping.postalCode} {shipping.countryCode}
              </p>
              {shipping.phone ? <p>{shipping.phone}</p> : null}
            </div>
          </div>
        )}
      </div>

      {/* Payments */}
      {order.payments.length > 0 && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-medium">Payments</h2>
          <div className="space-y-2">
            {order.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground capitalize">
                  {p.status.replace(/_/g, ' ')}
                </span>
                <span className="font-medium">
                  {formatMoney(p.amount, p.currencyCode)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}
