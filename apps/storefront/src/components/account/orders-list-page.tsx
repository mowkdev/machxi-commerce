'use client';

import Link from 'next/link';
import * as React from 'react';
import { useStoreListMyOrders } from '@repo/storefront-sdk';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatMoney } from '@/lib/format-money';
import { formatOrderStatus } from '@/lib/order-helpers';

const PAGE_SIZE = 10;

export function OrdersListPage() {
  const [page, setPage] = React.useState(1);
  const formatMoney = useFormatMoney();
  const { data, isLoading } = useStoreListMyOrders(
    { page, pageSize: PAGE_SIZE },
    { query: { placeholderData: (prev: unknown) => prev } },
  );

  const orders = data?.success ? data.data : [];
  const meta = data?.success ? data.meta : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>

      {isLoading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No orders yet</p>
          <Button asChild className="mt-4">
            <Link href="/products">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table header */}
          <div className="hidden rounded-lg border sm:block">
            <div className="grid grid-cols-[1fr_120px_100px_100px] gap-4 border-b bg-muted/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>Order</span>
              <span>Date</span>
              <span>Status</span>
              <span className="text-right">Total</span>
            </div>
            {orders.map((order) => {
              const { label, variant } = formatOrderStatus(order.status);
              return (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="grid grid-cols-[1fr_120px_100px_100px] items-center gap-4 border-b px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-muted/50"
                >
                  <div>
                    <span className="font-medium">{order.displayId}</span>
                    <span className="ml-2 text-muted-foreground">
                      {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    <Badge variant={variant}>{label}</Badge>
                  </span>
                  <span className="text-right font-medium">
                    {formatMoney(order.totalAmount, order.currencyCode)}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {orders.map((order) => {
              const { label, variant } = formatOrderStatus(order.status);
              return (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{order.displayId}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()} &middot;{' '}
                      {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                    </p>
                    <Badge variant={variant} className="mt-1.5">
                      {label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatMoney(order.totalAmount, order.currencyCode)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages} ({meta.totalItems} orders)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
