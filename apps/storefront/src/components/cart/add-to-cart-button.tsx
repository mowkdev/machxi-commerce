'use client';

import { ShoppingBag } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useCart } from '@/providers/cart-provider';

export function AddToCartButton({
  variantId,
  disabled,
}: {
  variantId?: string;
  disabled?: boolean;
}) {
  const { addItem, isMutating } = useCart();
  const [added, setAdded] = React.useState(false);

  async function handleAddToCart() {
    if (!variantId) return;
    await addItem(variantId, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <Button
      size="lg"
      className="w-full"
      disabled={disabled || !variantId || isMutating}
      onClick={handleAddToCart}
    >
      <ShoppingBag className="h-4 w-4" />
      {added ? 'Added to cart' : isMutating ? 'Adding...' : 'Add to cart'}
    </Button>
  );
}
