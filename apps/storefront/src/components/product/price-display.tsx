import { formatFromMinorUnits } from '@repo/utils';

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
  if (price) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {formatFromMinorUnits(price.amount, price.currencyCode)}
        </span>
        {price.compareAtAmount ? (
          <span className="text-sm text-muted-foreground line-through">
            {formatFromMinorUnits(price.compareAtAmount, price.currencyCode)}
          </span>
        ) : null}
      </div>
    );
  }

  if (!priceRange) {
    return <span className="text-sm text-muted-foreground">Price pending</span>;
  }

  const min = formatFromMinorUnits(
    priceRange.minAmount,
    priceRange.currencyCode
  );
  const max = formatFromMinorUnits(
    priceRange.maxAmount,
    priceRange.currencyCode
  );

  return (
    <span className="font-medium">
      {priceRange.minAmount === priceRange.maxAmount ? min : `${min} - ${max}`}
    </span>
  );
}
