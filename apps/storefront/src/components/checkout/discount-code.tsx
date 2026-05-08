'use client';

import * as React from 'react';
import {
  SdkRequestError,
  storeGetCartQueryKey,
  useStoreApplyCartPromotion,
  useStoreRemoveCartPromotion,
} from '@repo/storefront-sdk';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Promotion = {
  id: string;
  code: string;
  type: string;
  percentageValue: string | null;
  appliedAmount: number;
};

type DiscountCodeProps = {
  cartId: string;
  promotions: Promotion[];
  currencyCode: string;
  formatMoney: (amount: number, currency: string) => string;
};

export function DiscountCode({
  cartId,
  promotions,
  currencyCode,
  formatMoney,
}: DiscountCodeProps) {
  const qc = useQueryClient();
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const applyPromo = useStoreApplyCartPromotion();
  const removePromo = useStoreRemoveCartPromotion();

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    try {
      await applyPromo.mutateAsync({
        id: cartId,
        data: { code: code.trim() },
      });
      await qc.invalidateQueries({ queryKey: storeGetCartQueryKey(cartId) });
      setCode('');
    } catch (err) {
      setError(
        err instanceof SdkRequestError
          ? err.message
          : 'Could not apply discount code',
      );
    }
  }

  async function handleRemove(promotionId: string) {
    try {
      await removePromo.mutateAsync({ id: cartId, promotionId });
      await qc.invalidateQueries({ queryKey: storeGetCartQueryKey(cartId) });
    } catch {
      // silently fail — the UI will still show the promotion
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={(e) => void handleApply(e)} className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          placeholder="Discount code"
          className="flex-1"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={applyPromo.isPending || !code.trim()}
        >
          {applyPromo.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Apply'
          )}
        </Button>
      </form>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {promotions.map((promo) => (
        <div
          key={promo.id}
          className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium">{promo.code}</span>
            <span className="text-muted-foreground">
              {promo.type === 'percentage' && promo.percentageValue
                ? `-${promo.percentageValue}%`
                : `-${formatMoney(promo.appliedAmount, currencyCode)}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void handleRemove(promo.id)}
            disabled={removePromo.isPending}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
