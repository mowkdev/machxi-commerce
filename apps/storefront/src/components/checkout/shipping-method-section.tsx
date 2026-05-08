'use client';

type ShippingMethodSectionProps = {
  shippingTotal: number;
  currencyCode: string;
  formatMoney: (amount: number, currency: string) => string;
  addressComplete: boolean;
};

export function ShippingMethodSection({
  shippingTotal,
  currencyCode,
  formatMoney,
  addressComplete,
}: ShippingMethodSectionProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Shipping method</h2>

      {!addressComplete ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Enter your shipping address to view available shipping methods.
        </p>
      ) : (
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-primary bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="shipping"
              defaultChecked
              className="accent-primary"
            />
            <span className="text-sm font-medium">Standard shipping</span>
          </div>
          <span className="text-sm font-medium">
            {shippingTotal === 0
              ? 'FREE'
              : formatMoney(shippingTotal, currencyCode)}
          </span>
        </label>
      )}
    </section>
  );
}
