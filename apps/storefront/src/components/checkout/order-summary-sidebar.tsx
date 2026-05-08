'use client';

import { Separator } from '@/components/ui/separator';
import { DiscountCode } from '@/components/checkout/discount-code';
import type { useCart } from '@/providers/cart-provider';

type Cart = NonNullable<ReturnType<typeof useCart>['cart']>;

type OrderSummarySidebarProps = {
  cart: Cart;
  cartId: string;
  formatMoney: (amount: number, currency: string) => string;
};

export function OrderSummarySidebar({
  cart,
  cartId,
  formatMoney,
}: OrderSummarySidebarProps) {
  const cc = cart.currencyCode;

  return (
    <div className="space-y-4">
      {/* Product list */}
      <ul className="space-y-3">
        {cart.items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <div className="relative shrink-0">
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="h-16 w-16 rounded-md border object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-md border bg-muted" />
              )}
              {item.quantity > 1 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground text-[10px] font-medium text-background">
                  {item.quantity}
                </span>
              )}
            </div>
            <div className="flex flex-1 items-start justify-between gap-2 text-sm">
              <div>
                <p className="font-medium leading-tight">{item.title}</p>
                {item.variantTitle && (
                  <p className="text-muted-foreground">{item.variantTitle}</p>
                )}
              </div>
              <span className="shrink-0 font-medium">
                {formatMoney(item.linePayment, cc)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <Separator />

      {/* Discount code */}
      <DiscountCode
        cartId={cartId}
        promotions={cart.promotions}
        currencyCode={cc}
        formatMoney={formatMoney}
      />

      <Separator />

      {/* Totals */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatMoney(cart.totals.subtotal, cc)}</span>
        </div>
        {cart.totals.discountTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discounts</span>
            <span className="text-green-600">
              -{formatMoney(cart.totals.discountTotal, cc)}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span>
            {cart.totals.shippingTotal === 0
              ? 'FREE'
              : formatMoney(cart.totals.shippingTotal, cc)}
          </span>
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">Total</span>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground">
            {cc.toUpperCase()}
          </span>
          <span className="text-xl font-semibold">
            {formatMoney(cart.totals.total, cc)}
          </span>
        </div>
      </div>

      {cart.totals.taxTotal > 0 && (
        <p className="text-xs text-muted-foreground">
          Including {formatMoney(cart.totals.taxTotal, cc)} in taxes
        </p>
      )}
    </div>
  );
}
