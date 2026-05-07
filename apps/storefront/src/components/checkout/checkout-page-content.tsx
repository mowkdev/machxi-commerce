'use client';

import { formatFromMinorUnits } from '@repo/utils';
import {
  SdkRequestError,
  storeGetCartQueryKey,
  useStoreCompleteCart,
  useStoreListPaymentMethods,
  useStoreSetCartAddresses,
} from '@repo/storefront-sdk';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, ShoppingBag } from 'lucide-react';

import { StripePaymentForm } from '@/components/checkout/stripe-payment-form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/providers/cart-provider';

type StripeClientPayload = {
  kind: string;
  publishableKey?: string;
  clientSecret: string;
  paymentIntentId: string;
};

function isStripePayload(value: unknown): value is StripeClientPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    (value as { kind?: unknown }).kind === 'stripe' &&
    'clientSecret' in value &&
    typeof (value as { clientSecret?: unknown }).clientSecret === 'string'
  );
}

export function CheckoutPageContent() {
  const router = useRouter();
  const qc = useQueryClient();
  const {
    cart,
    cartId,
    isLoading: cartLoading,
    ensureCart,
    clearCart,
  } = useCart();

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [addressLine1, setAddressLine1] = React.useState('');
  const [addressLine2, setAddressLine2] = React.useState('');
  const [city, setCity] = React.useState('');
  const [postalCode, setPostalCode] = React.useState('');
  const [countryCode, setCountryCode] = React.useState('US');
  const [selectedCode, setSelectedCode] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<'details' | 'pay'>('details');
  const [payContext, setPayContext] = React.useState<{
    orderId: string;
    displayId: string;
    clientSecret: string;
    publishableKey: string;
  } | null>(null);

  React.useEffect(() => {
    void ensureCart();
  }, [ensureCart]);

  const methodsQuery = useStoreListPaymentMethods();
  const methods = React.useMemo(() => {
    const raw = methodsQuery.data?.success ? methodsQuery.data.data : [];
    return [...raw].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [methodsQuery.data]);

  React.useEffect(() => {
    if (methods.length === 0 || selectedCode) return;
    setSelectedCode(methods[0]!.code);
  }, [methods, selectedCode]);

  const setAddresses = useStoreSetCartAddresses();
  const completeCart = useStoreCompleteCart();

  async function invalidateCartQueries(id: string) {
    await qc.invalidateQueries({ queryKey: storeGetCartQueryKey(id) });
  }

  async function onSaveShipping(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!cartId) return;
    const cc = countryCode.trim().toUpperCase();
    if (cc.length !== 2) {
      setFormError('Country must be a 2-letter ISO code (e.g. DE, US).');
      return;
    }
    try {
      await setAddresses.mutateAsync({
        id: cartId,
        data: {
          guestShippingAddress: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            company: null,
            phone: null,
            isDefaultShipping: false,
            isDefaultBilling: false,
            addressLine1: addressLine1.trim(),
            addressLine2: addressLine2.trim() || null,
            city: city.trim(),
            provinceCode: null,
            postalCode: postalCode.trim(),
            countryCode: cc,
          },
        },
      });
      await invalidateCartQueries(cartId);
    } catch (err) {
      setFormError(
        err instanceof SdkRequestError ? err.message : 'Could not save address'
      );
    }
  }

  async function onPlaceOrder() {
    setFormError(null);
    if (!cartId || !selectedCode) return;
    try {
      const res = await completeCart.mutateAsync({
        id: cartId,
        data: { paymentProviderCode: selectedCode },
      });
      if (!res.success) return;

      const { orderId, displayId, payment, paymentSessionError } = res.data;
      const payload = payment.clientPayload;

      clearCart();

      if (payment.kind === 'automatic' && isStripePayload(payload)) {
        const pk =
          payload.publishableKey?.trim() ||
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
          '';
        if (!pk) {
          setFormError(
            'Stripe publishable key is missing. Set it on the payment provider config or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.'
          );
          router.push(
            `/order/confirmation/${orderId}?display=${encodeURIComponent(displayId)}`
          );
          return;
        }
        if (paymentSessionError) {
          setFormError(
            `Payment session could not be started: ${paymentSessionError}`
          );
        }
        setPayContext({
          orderId,
          displayId,
          clientSecret: payload.clientSecret,
          publishableKey: pk,
        });
        setStep('pay');
        return;
      }

      router.push(
        `/order/confirmation/${orderId}?display=${encodeURIComponent(displayId)}`
      );
    } catch (err) {
      setFormError(
        err instanceof SdkRequestError ? err.message : 'Checkout failed'
      );
    }
  }

  if (cartLoading || !cartId) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-dashed p-12 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-6 text-2xl font-semibold">Nothing to check out</h1>
        <p className="mt-2 text-muted-foreground">
          Add products to your cart before continuing.
        </p>
        <Button asChild className="mt-6">
          <Link href="/cart">View cart</Link>
        </Button>
      </div>
    );
  }

  if (step === 'pay' && payContext) {
    const returnUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/order/confirmation/${payContext.orderId}?display=${encodeURIComponent(payContext.displayId)}`;

    return (
      <div className="mx-auto grid max-w-xl gap-6">
        <div>
          <Button type="button" variant="ghost" onClick={() => setStep('details')}>
            ← Back
          </Button>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pay</h1>
          <p className="text-sm text-muted-foreground">
            Order {payContext.displayId} — complete card authentication if
            prompted.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Card payment</CardTitle>
            <CardDescription>Secured by Stripe.</CardDescription>
          </CardHeader>
          <CardContent>
            <StripePaymentForm
              publishableKey={payContext.publishableKey}
              clientSecret={payContext.clientSecret}
              returnUrl={returnUrl}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const addressMissing = !cart.shippingAddressId;
  const busy =
    setAddresses.isPending || completeCart.isPending || methodsQuery.isLoading;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-8">
        <div>
          <Button asChild variant="ghost" className="mb-4 -ml-2">
            <Link href="/cart">← Back to cart</Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
          <p className="text-sm text-muted-foreground">
            Enter a shipping address, choose a payment method, and place your
            order.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Shipping</CardTitle>
            <CardDescription>
              Guest checkout — your address is stored on the order only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSaveShipping} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="First name">
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Last name">
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <Field label="Address line 1">
                <Input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  required
                />
              </Field>
              <Field label="Address line 2 (optional)">
                <Input
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="City">
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Postal code">
                  <Input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <Field label="Country (ISO)">
                <Input
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                  maxLength={2}
                  required
                />
              </Field>
              <Button type="submit" disabled={setAddresses.isPending}>
                {setAddresses.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save shipping address'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
            <CardDescription>
              Methods are configured in the admin under Settings → Payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {methodsQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : methods.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payment methods are available. Enable &quot;manual_invoice&quot; in
                the admin to test checkout.
              </p>
            ) : (
              <div className="space-y-2">
                {methods.map((m) => (
                  <label
                    key={m.code}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary"
                  >
                    <input
                      type="radio"
                      name="pay"
                      className="mt-1"
                      checked={selectedCode === m.code}
                      onChange={() => setSelectedCode(m.code)}
                    />
                    <span>
                      <span className="font-medium">{m.name}</span>
                      {m.description ? (
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                          {m.description}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-xs capitalize text-muted-foreground">
                        {m.kind}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            <Button
              type="button"
              className="w-full"
              disabled={busy || addressMissing || !selectedCode}
              onClick={() => void onPlaceOrder()}
            >
              {completeCart.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing order…
                </>
              ) : (
                'Place order'
              )}
            </Button>
            {addressMissing ? (
              <p className="text-xs text-muted-foreground">
                Save a shipping address before placing the order.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
      </div>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="space-y-2">
            {cart.items.map((item) => (
              <li
                key={item.id}
                className="flex justify-between gap-2 text-muted-foreground"
              >
                <span>
                  {item.title}
                  {item.variantTitle ? ` — ${item.variantTitle}` : ''} ×{' '}
                  {item.quantity}
                </span>
                <span className="shrink-0 text-foreground">
                  {formatFromMinorUnits(item.linePayment, cart.currencyCode)}
                </span>
              </li>
            ))}
          </ul>
          <Separator />
          <Row
            label="Subtotal"
            value={formatFromMinorUnits(
              cart.totals.subtotal,
              cart.currencyCode
            )}
          />
          <Row
            label="Discounts"
            value={`-${formatFromMinorUnits(
              cart.totals.discountTotal,
              cart.currencyCode
            )}`}
          />
          <Row
            label="Shipping"
            value={formatFromMinorUnits(
              cart.totals.shippingTotal,
              cart.currencyCode
            )}
          />
          <Row
            label="Tax"
            value={formatFromMinorUnits(cart.totals.taxTotal, cart.currencyCode)}
          />
          <Separator />
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>
              {formatFromMinorUnits(cart.totals.total, cart.currencyCode)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
