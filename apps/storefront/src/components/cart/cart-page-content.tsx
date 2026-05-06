'use client';

import { formatFromMinorUnits } from '@repo/utils';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';

import { CartItem } from '@/components/cart/cart-item';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/providers/cart-provider';

export function CartPageContent() {
  const { cart, isLoading } = useCart();

  if (isLoading) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-dashed p-12 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-6 text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">
          Start shopping and add a few products to your cart.
        </p>
        <Button asChild className="mt-6">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {cart.items.length} line items
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/products">Continue shopping</Link>
          </Button>
        </div>
        <div className="divide-y rounded-xl border bg-card px-5">
          {cart.items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              currencyCode={cart.currencyCode}
            />
          ))}
        </div>
      </section>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SummaryRow
            label="Subtotal"
            value={formatFromMinorUnits(
              cart.totals.subtotal,
              cart.currencyCode
            )}
          />
          <SummaryRow
            label="Discounts"
            value={`-${formatFromMinorUnits(
              cart.totals.discountTotal,
              cart.currencyCode
            )}`}
          />
          <SummaryRow
            label="Shipping"
            value={formatFromMinorUnits(
              cart.totals.shippingTotal,
              cart.currencyCode
            )}
          />
          <SummaryRow
            label="Tax"
            value={formatFromMinorUnits(cart.totals.taxTotal, cart.currencyCode)}
          />
          <Separator />
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span>
              {formatFromMinorUnits(cart.totals.total, cart.currencyCode)}
            </span>
          </div>
          <Button className="w-full" disabled>
            Checkout coming soon
          </Button>
          <p className="text-xs text-muted-foreground">
            Cart completion is available in the SDK and can be connected once
            checkout requirements are finalized.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
