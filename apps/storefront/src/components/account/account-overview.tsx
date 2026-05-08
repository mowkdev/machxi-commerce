'use client';

import Link from 'next/link';
import {
  useStoreGetCurrentCustomer,
  useStoreListMyOrders,
  useStoreListAddresses,
} from '@repo/storefront-sdk';
import { Package, MapPin, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatMoney } from '@/lib/format-money';
import { formatOrderStatus } from '@/lib/order-helpers';

export function AccountOverview() {
  const customerQuery = useStoreGetCurrentCustomer();
  const ordersQuery = useStoreListMyOrders({ page: 1, pageSize: 5 });
  const addressesQuery = useStoreListAddresses();
  const formatMoney = useFormatMoney();

  const customer = customerQuery.data?.success
    ? customerQuery.data.data
    : null;
  const orders = ordersQuery.data?.success ? ordersQuery.data.data : [];
  const addresses = addressesQuery.data?.success
    ? addressesQuery.data.data
    : [];
  const defaultAddr = addresses.find((a) => a.isDefaultShipping);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{customer?.firstName ? `, ${customer.firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{customer?.email}</p>
      </div>

      {/* Recent orders */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/account/orders">
              View all <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {ordersQuery.isLoading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            You haven&apos;t placed any orders yet.
          </p>
        ) : (
          <div className="mt-4 divide-y rounded-lg border">
            {orders.map((order) => {
              const { label, variant } = formatOrderStatus(order.status);
              return (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{order.displayId}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()} &middot;{' '}
                        {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={variant}>{label}</Badge>
                    <span className="text-sm font-medium">
                      {formatMoney(order.totalAmount, order.currencyCode)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Default address */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Default address</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/account/addresses">
              Manage <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {addressesQuery.isLoading ? (
          <Skeleton className="mt-4 h-24 w-full" />
        ) : defaultAddr ? (
          <div className="mt-4 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">
                  {defaultAddr.firstName} {defaultAddr.lastName}
                </p>
                <p className="text-muted-foreground">
                  {defaultAddr.addressLine1}
                </p>
                {defaultAddr.addressLine2 ? (
                  <p className="text-muted-foreground">
                    {defaultAddr.addressLine2}
                  </p>
                ) : null}
                <p className="text-muted-foreground">
                  {defaultAddr.city}, {defaultAddr.postalCode}{' '}
                  {defaultAddr.countryCode}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No default shipping address set.{' '}
            <Link href="/account/addresses" className="underline">
              Add one
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
