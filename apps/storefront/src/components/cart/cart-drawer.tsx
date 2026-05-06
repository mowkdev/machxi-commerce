'use client';

import { formatFromMinorUnits } from '@repo/utils';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';

import { CartItem } from '@/components/cart/cart-item';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCart } from '@/providers/cart-provider';

export function CartDrawer() {
  const { cart, itemCount, isLoading } = useCart();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ShoppingBag className="h-5 w-5" />
          {itemCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
              {itemCount}
            </span>
          ) : null}
          <span className="sr-only">Open cart</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>
            Review your selected products before checkout.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="py-8 text-sm text-muted-foreground">
              Loading cart...
            </p>
          ) : cart && cart.items.length > 0 ? (
            <div className="divide-y">
              {cart.items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  currencyCode={cart.currencyCode}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 font-medium">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add products to see them here.
              </p>
            </div>
          )}
        </div>

        {cart && cart.items.length > 0 ? (
          <SheetFooter className="border-t pt-4">
            <div className="w-full space-y-4">
              <CartTotals cart={cart} />
              <SheetClose asChild>
                <Button asChild className="w-full">
                  <Link href="/cart">View cart</Link>
                </Button>
              </SheetClose>
            </div>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function CartTotals({ cart }: { cart: NonNullable<ReturnType<typeof useCart>['cart']> }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatFromMinorUnits(cart.totals.subtotal, cart.currencyCode)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Discounts</span>
        <span>
          -{formatFromMinorUnits(cart.totals.discountTotal, cart.currencyCode)}
        </span>
      </div>
      <Separator />
      <div className="flex justify-between text-base font-semibold">
        <span>Total</span>
        <span>{formatFromMinorUnits(cart.totals.total, cart.currencyCode)}</span>
      </div>
    </div>
  );
}
