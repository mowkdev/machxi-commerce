'use client';

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe, type StripeElementsOptions } from '@stripe/stripe-js';
import * as React from 'react';

import { Button } from '@/components/ui/button';

type StripePaymentFormProps = {
  publishableKey: string;
  clientSecret: string;
  returnUrl: string;
};

export function StripePaymentForm({
  publishableKey,
  clientSecret,
  returnUrl,
}: StripePaymentFormProps) {
  const [stripePromise] = React.useState(() => loadStripe(publishableKey));

  const options = React.useMemo<StripeElementsOptions>(
    () => ({
      clientSecret,
      appearance: { theme: 'stripe' },
    }),
    [clientSecret]
  );

  if (!stripePromise) {
    return <p className="text-sm text-muted-foreground">Loading payments…</p>;
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <InnerStripeCheckout returnUrl={returnUrl} />
    </Elements>
  );
}

function InnerStripeCheckout({ returnUrl }: { returnUrl: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmErr } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    setSubmitting(false);
    if (confirmErr) {
      setError(confirmErr.message ?? 'Payment failed');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement />
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={!stripe || submitting} className="w-full">
        {submitting ? 'Processing…' : 'Pay now'}
      </Button>
    </form>
  );
}
