'use client';

import { useFormatMoney } from '@/lib/format-money';

type PriceRange = {
  currencyCode: string;
  minAmount: number;
  maxAmount: number;
} | null;

type UnitPrice = {
  currencyCode: string;
  amount: number;
  compareAtAmount: number | null;
} | null;

export function PriceDisplay({
  priceRange,
  price,
}: {
  priceRange?: PriceRange;
  price?: UnitPrice;
}) {
  const formatMoney = useFormatMoney();

  if (price) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {formatMoney(price.amount, price.currencyCode)}
        </span>
        {price.compareAtAmount ? (
          <span className="text-sm text-muted-foreground line-through">
            {formatMoney(price.compareAtAmount, price.currencyCode)}
          </span>
        ) : null}
      </div>
    );
  }

  if (!priceRange) {
    return <span className="text-sm text-muted-foreground">Price pending</span>;
  }

  const min = formatMoney(priceRange.minAmount, priceRange.currencyCode);
  const max = formatMoney(priceRange.maxAmount, priceRange.currencyCode);

  return (
    <span className="font-medium">
      {priceRange.minAmount === priceRange.maxAmount ? min : `${min} - ${max}`}
    </span>
  );
}
