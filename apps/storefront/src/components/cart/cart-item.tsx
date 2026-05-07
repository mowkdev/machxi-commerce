'use client';

import type { StoreCart } from '@repo/types/storefront';
import { Minus, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { useFormatMoney } from '@/lib/format-money';
import { useCart } from '@/providers/cart-provider';

type CartLineItem = StoreCart['items'][number];

export function CartItem({
  item,
  currencyCode,
}: {
  item: CartLineItem;
  currencyCode: string;
}) {
  const { updateItem, removeItem, isMutating } = useCart();
  const formatMoney = useFormatMoney();

  async function decrement() {
    if (item.quantity <= 1) {
      await removeItem(item.id);
      return;
    }
    await updateItem(item.id, item.quantity - 1);
  }

  return (
    <div className="flex gap-4 py-5">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            fill
            sizes="96px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-3">
          <div>
            <h3 className="font-medium">{item.title}</h3>
            {item.variantTitle ? (
              <p className="text-sm text-muted-foreground">
                {item.variantTitle}
              </p>
            ) : null}
            <p className="mt-1 text-sm text-muted-foreground">SKU {item.sku}</p>
          </div>
          <div className="text-right font-medium">
            {formatMoney(item.lineTotal, currencyCode)}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center rounded-md border">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              disabled={isMutating}
              onClick={decrement}
            >
              <Minus className="h-4 w-4" />
              <span className="sr-only">Decrease quantity</span>
            </Button>
            <span className="w-10 text-center text-sm font-medium">
              {item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              disabled={isMutating}
              onClick={() => updateItem(item.id, item.quantity + 1)}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Increase quantity</span>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={isMutating}
            onClick={() => removeItem(item.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Remove item</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
