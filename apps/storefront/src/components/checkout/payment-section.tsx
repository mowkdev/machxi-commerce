'use client';

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { StripePaymentForm } from '@/components/checkout/stripe-payment-form';

type PaymentMethod = {
  code: string;
  name: string;
  description: string | null;
  kind: string;
  displayOrder: number;
};

type PayContext = {
  orderId: string;
  displayId: string;
  clientSecret: string;
  publishableKey: string;
};

type PaymentSectionProps = {
  methods: PaymentMethod[];
  methodsLoading: boolean;
  selectedCode: string | null;
  setSelectedCode: (code: string) => void;
  billingMatchesShipping: boolean;
  setBillingMatchesShipping: (val: boolean) => void;
  payContext: PayContext | null;
};

export function PaymentSection({
  methods,
  methodsLoading,
  selectedCode,
  setSelectedCode,
  billingMatchesShipping,
  setBillingMatchesShipping,
  payContext,
}: PaymentSectionProps) {
  const returnUrl = payContext
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/order/confirmation/${payContext.orderId}?display=${encodeURIComponent(payContext.displayId)}`
    : '';

  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">Payment</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        All transactions are secure and encrypted.
      </p>

      {methodsLoading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : methods.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No payment methods available. Configure them in the admin panel.
        </p>
      ) : payContext ? (
        <div className="rounded-lg border p-4">
          <StripePaymentForm
            publishableKey={payContext.publishableKey}
            clientSecret={payContext.clientSecret}
            returnUrl={returnUrl}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          {methods.map((m, i) => (
            <label
              key={m.code}
              className={`flex cursor-pointer items-center gap-3 p-4 ${
                selectedCode === m.code ? 'bg-primary/5' : ''
              } ${i > 0 ? 'border-t' : ''}`}
            >
              <input
                type="radio"
                name="payment"
                className="accent-primary"
                checked={selectedCode === m.code}
                onChange={() => setSelectedCode(m.code)}
              />
              <div className="flex-1">
                <span className="text-sm font-medium">{m.name}</span>
                {m.description && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    {m.description}
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="rounded"
          checked={billingMatchesShipping}
          onChange={(e) => setBillingMatchesShipping(e.target.checked)}
        />
        Use shipping address as billing address
      </label>
    </section>
  );
}
