'use client';

import {
  SdkRequestError,
  storeGetCartQueryKey,
  storeGetCurrentCustomerQueryKey,
  storeListAddressesQueryKey,
  useStoreAttachCustomerToCart,
  useStoreCompleteCart,
  useStoreCreateAddress,
  useStoreGetCurrentCustomer,
  useStoreListAddresses,
  useStoreListPaymentMethods,
  useStoreLoginCustomer,
  useStoreSetCartAddresses,
  useStoreSetCartEmail,
} from '@repo/storefront-sdk';
import { useFormatMoney } from '@/lib/format-money';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, ShoppingBag } from 'lucide-react';

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
import { saveCustomerToken } from '@/lib/sdk';

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

type AddressFields = {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  countryCode: string;
};

function blankAddress(): AddressFields {
  return {
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    countryCode: 'US',
  };
}

export function CheckoutPageContent() {
  const router = useRouter();
  const qc = useQueryClient();
  const formatMoney = useFormatMoney();
  const {
    cart,
    cartId,
    isLoading: cartLoading,
    ensureCart,
    clearCart,
  } = useCart();

  // --- Auth ---
  const customerQuery = useStoreGetCurrentCustomer({
    query: { retry: false, retryOnMount: false },
  });
  const customer = customerQuery.data?.success ? customerQuery.data.data : null;
  const isAuthenticated = Boolean(customer);

  // --- Saved addresses (registered users only) ---
  const addressesQuery = useStoreListAddresses({
    query: { enabled: isAuthenticated, retry: false },
  });
  const savedAddresses = addressesQuery.data?.success
    ? addressesQuery.data.data
    : [];

  // --- Auto-attach logged-in customer to a guest cart ---
  const attachCustomer = useStoreAttachCustomerToCart();
  const [isAttaching, setIsAttaching] = React.useState(false);

  React.useEffect(() => {
    if (!customer || !cartId || !cart || cart.customerId !== null || isAttaching) {
      return;
    }
    setIsAttaching(true);
    attachCustomer.mutate(
      { id: cartId },
      {
        onSettled: async () => {
          await qc.invalidateQueries({ queryKey: storeGetCartQueryKey(cartId) });
          setIsAttaching(false);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, cartId, cart?.customerId]);

  // --- Registered address mode ---
  const [addressMode, setAddressMode] = React.useState<'select' | 'new'>('select');
  const [selectedAddressId, setSelectedAddressId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated || savedAddresses.length === 0) return;
    if (selectedAddressId) return;
    const def =
      savedAddresses.find((a) => a.isDefaultShipping) ?? savedAddresses[0];
    if (def) setSelectedAddressId(def.id);
  }, [isAuthenticated, savedAddresses, selectedAddressId]);

  // --- Address form fields ---
  const [fields, setFields] = React.useState<AddressFields>(blankAddress);
  function setField<K extends keyof AddressFields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  // --- Step machine ---
  // null = resolving, email = identity step, details = address+payment, pay = Stripe UI
  const [step, setStep] = React.useState<'email' | 'details' | 'pay' | null>(null);

  const isReady =
    !cartLoading && !!cartId && !customerQuery.isLoading && !isAttaching;

  React.useEffect(() => {
    if (!isReady || step !== null) return;
    if (isAuthenticated || cart?.guestEmail) {
      setStep('details');
    } else {
      setStep('email');
    }
  }, [isReady, step, isAuthenticated, cart?.guestEmail]);

  // Advance from email step when auth is confirmed (after inline login)
  React.useEffect(() => {
    if (step === 'email' && isAuthenticated) {
      setStep('details');
    }
  }, [step, isAuthenticated]);

  // --- Payment ---
  const [selectedCode, setSelectedCode] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
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
  const createAddress = useStoreCreateAddress();
  const completeCart = useStoreCompleteCart();
  const setCartEmail = useStoreSetCartEmail();

  async function invalidateCartQueries(id: string) {
    await qc.invalidateQueries({ queryKey: storeGetCartQueryKey(id) });
  }

  async function onSaveShipping(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!cartId) return;

    try {
      if (isAuthenticated) {
        if (addressMode === 'select' && selectedAddressId) {
          await setAddresses.mutateAsync({
            id: cartId,
            data: { shippingAddressId: selectedAddressId },
          });
        } else {
          const cc = fields.countryCode.trim().toUpperCase();
          if (cc.length !== 2) {
            setFormError('Country must be a 2-letter ISO code (e.g. DE, US).');
            return;
          }
          const created = await createAddress.mutateAsync({
            data: {
              firstName: fields.firstName.trim(),
              lastName: fields.lastName.trim(),
              company: null,
              phone: null,
              isDefaultShipping: false,
              isDefaultBilling: false,
              addressLine1: fields.addressLine1.trim(),
              addressLine2: fields.addressLine2.trim() || null,
              city: fields.city.trim(),
              provinceCode: null,
              postalCode: fields.postalCode.trim(),
              countryCode: cc,
            },
          });
          await setAddresses.mutateAsync({
            id: cartId,
            data: { shippingAddressId: created.data.id },
          });
          await qc.invalidateQueries({
            queryKey: storeListAddressesQueryKey(),
          });
          setSelectedAddressId(created.data.id);
          setAddressMode('select');
          setFields(blankAddress());
        }
      } else {
        const cc = fields.countryCode.trim().toUpperCase();
        if (cc.length !== 2) {
          setFormError('Country must be a 2-letter ISO code (e.g. DE, US).');
          return;
        }
        await setAddresses.mutateAsync({
          id: cartId,
          data: {
            guestShippingAddress: {
              firstName: fields.firstName.trim(),
              lastName: fields.lastName.trim(),
              company: null,
              phone: null,
              isDefaultShipping: false,
              isDefaultBilling: false,
              addressLine1: fields.addressLine1.trim(),
              addressLine2: fields.addressLine2.trim() || null,
              city: fields.city.trim(),
              provinceCode: null,
              postalCode: fields.postalCode.trim(),
              countryCode: cc,
            },
          },
        });
      }
      await invalidateCartQueries(cartId);
    } catch (err) {
      setFormError(
        err instanceof SdkRequestError ? err.message : 'Could not save address',
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
            'Stripe publishable key is missing. Set it on the payment provider config or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.',
          );
          router.push(
            `/order/confirmation/${orderId}?display=${encodeURIComponent(displayId)}`,
          );
          return;
        }
        if (paymentSessionError) {
          setFormError(
            `Payment session could not be started: ${paymentSessionError}`,
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
        `/order/confirmation/${orderId}?display=${encodeURIComponent(displayId)}`,
      );
    } catch (err) {
      setFormError(
        err instanceof SdkRequestError ? err.message : 'Checkout failed',
      );
    }
  }

  // --- Loading states ---
  if (cartLoading || !cartId || customerQuery.isLoading || isAttaching || step === null) {
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
            Order {payContext.displayId} — complete card authentication if prompted.
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

  // ── Email / identity step ────────────────────────────────────────────────
  if (step === 'email') {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <div>
            <Button asChild variant="ghost" className="mb-4 -ml-2">
              <Link href="/cart">← Back to cart</Link>
            </Button>
            <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
          </div>

          <GuestIdentityStep
            cartId={cartId}
            onContinue={() => setStep('details')}
            onLoginSuccess={(token) => {
              saveCustomerToken(token);
              qc.invalidateQueries({ queryKey: storeGetCurrentCustomerQueryKey() });
              // step will advance via useEffect when isAuthenticated becomes true
            }}
            setCartEmail={setCartEmail}
          />
        </div>

        <OrderSummaryCard cart={cart} formatMoney={formatMoney} />
      </div>
    );
  }

  // ── Details step (address + payment) ────────────────────────────────────
  const addressMissing = !cart.shippingAddressId;
  const shippingBusy =
    setAddresses.isPending || createAddress.isPending || addressesQuery.isLoading;
  const busy = shippingBusy || completeCart.isPending || methodsQuery.isLoading;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-8">
        <div>
          <Button asChild variant="ghost" className="mb-4 -ml-2">
            <Link href="/cart">← Back to cart</Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
          <p className="text-sm text-muted-foreground">
            {isAuthenticated
              ? `Signed in as ${customer?.email}`
              : cart.guestEmail
                ? `Continuing as guest · ${cart.guestEmail}`
                : 'Continuing as guest.'}
          </p>
        </div>

        {/* ── Shipping ── */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping</CardTitle>
            <CardDescription>
              {isAuthenticated
                ? 'Select a saved address or add a new one.'
                : 'Your address will be stored on the order only.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAuthenticated ? (
              <RegisteredShipping
                savedAddresses={savedAddresses}
                addressesLoading={addressesQuery.isLoading}
                addressMode={addressMode}
                selectedAddressId={selectedAddressId}
                fields={fields}
                isPending={shippingBusy}
                confirmedAddressId={cart.shippingAddressId}
                onSelectAddress={setSelectedAddressId}
                onSetMode={setAddressMode}
                onSetField={setField}
                onSubmit={onSaveShipping}
              />
            ) : (
              <GuestShipping
                fields={fields}
                isPending={shippingBusy}
                confirmedAddressId={cart.shippingAddressId}
                onSetField={setField}
                onSubmit={onSaveShipping}
              />
            )}
          </CardContent>
        </Card>

        {/* ── Payment ── */}
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
                No payment methods are available. Enable &quot;manual_invoice&quot;
                in the admin to test checkout.
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
                {isAuthenticated
                  ? 'Select or add a shipping address before placing the order.'
                  : 'Save a shipping address before placing the order.'}
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

      <OrderSummaryCard cart={cart} formatMoney={formatMoney} />
    </div>
  );
}

// ── Guest identity step ───────────────────────────────────────────────────────

type GuestIdentityStepProps = {
  cartId: string;
  onContinue: () => void;
  onLoginSuccess: (token: string) => void;
  setCartEmail: ReturnType<typeof useStoreSetCartEmail>;
};

function GuestIdentityStep({
  cartId,
  onContinue,
  onLoginSuccess,
  setCartEmail,
}: GuestIdentityStepProps) {
  const qc = useQueryClient();
  const [email, setEmail] = React.useState('');
  const [mode, setMode] = React.useState<'guest' | 'login'>('guest');
  const [loginEmail, setLoginEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const login = useStoreLoginCustomer();

  async function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await setCartEmail.mutateAsync({ id: cartId, data: { email } });
      await qc.invalidateQueries({ queryKey: storeGetCartQueryKey(cartId) });
      onContinue();
    } catch (err) {
      setError(err instanceof SdkRequestError ? err.message : 'Could not save email');
    }
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await login.mutateAsync({
        data: { email: loginEmail, password },
      });
      if (res.success) {
        onLoginSuccess(res.data.token);
      }
    } catch (err) {
      setError(
        err instanceof SdkRequestError ? err.message : 'Login failed',
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact</CardTitle>
        <CardDescription>
          Enter your email to continue as a guest, or sign in to use your saved
          addresses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode toggle */}
        <div className="flex rounded-lg border p-1 text-sm">
          <button
            type="button"
            onClick={() => { setMode('guest'); setError(null); }}
            className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
              mode === 'guest'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Guest
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
              mode === 'login'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign in
          </button>
        </div>

        {mode === 'guest' ? (
          <form onSubmit={(e) => void handleGuestSubmit(e)} className="space-y-3">
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </Field>
            <Button type="submit" className="w-full" disabled={setCartEmail.isPending}>
              {setCartEmail.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Continuing…
                </>
              ) : (
                'Continue as guest'
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={(e) => void handleLoginSubmit(e)} className="space-y-3">
            <Field label="Email">
              <Input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        )}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ── Guest shipping section ────────────────────────────────────────────────────

type GuestShippingProps = {
  fields: AddressFields;
  isPending: boolean;
  confirmedAddressId: string | null;
  onSetField: <K extends keyof AddressFields>(key: K, value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
};

function GuestShipping({
  fields,
  isPending,
  confirmedAddressId,
  onSetField,
  onSubmit,
}: GuestShippingProps) {
  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
      <AddressFormFields fields={fields} onSetField={onSetField} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Use this address'
          )}
        </Button>
        {confirmedAddressId ? (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Address saved
          </span>
        ) : null}
      </div>
    </form>
  );
}

// ── Registered shipping section ───────────────────────────────────────────────

type SavedAddress = {
  id: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string;
  countryCode: string;
  isDefaultShipping: boolean;
};

type RegisteredShippingProps = {
  savedAddresses: SavedAddress[];
  addressesLoading: boolean;
  addressMode: 'select' | 'new';
  selectedAddressId: string | null;
  fields: AddressFields;
  isPending: boolean;
  confirmedAddressId: string | null;
  onSelectAddress: (id: string) => void;
  onSetMode: (mode: 'select' | 'new') => void;
  onSetField: <K extends keyof AddressFields>(key: K, value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
};

function RegisteredShipping({
  savedAddresses,
  addressesLoading,
  addressMode,
  selectedAddressId,
  fields,
  isPending,
  confirmedAddressId,
  onSelectAddress,
  onSetMode,
  onSetField,
  onSubmit,
}: RegisteredShippingProps) {
  if (addressesLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      {savedAddresses.length > 0 && (
        <div className="space-y-2">
          {savedAddresses.map((addr) => (
            <label
              key={addr.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary"
            >
              <input
                type="radio"
                name="savedAddress"
                className="mt-1"
                checked={addressMode === 'select' && selectedAddressId === addr.id}
                onChange={() => {
                  onSelectAddress(addr.id);
                  onSetMode('select');
                }}
              />
              <span className="text-sm">
                <span className="font-medium">
                  {addr.firstName} {addr.lastName}
                </span>
                {addr.isDefaultShipping ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Default
                  </span>
                ) : null}
                <span className="mt-0.5 block text-muted-foreground">
                  {addr.addressLine1}
                  {addr.addressLine2 ? `, ${addr.addressLine2}` : ''},{' '}
                  {addr.city} {addr.postalCode}, {addr.countryCode}
                </span>
              </span>
            </label>
          ))}

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary">
            <input
              type="radio"
              name="savedAddress"
              className="mt-1"
              checked={addressMode === 'new'}
              onChange={() => onSetMode('new')}
            />
            <span className="text-sm font-medium">Add a new address</span>
          </label>
        </div>
      )}

      {(addressMode === 'new' || savedAddresses.length === 0) && (
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-medium">
            {savedAddresses.length === 0
              ? 'Enter a shipping address'
              : 'New address'}
          </p>
          <AddressFormFields fields={fields} onSetField={onSetField} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={
            isPending ||
            (addressMode === 'select' && !selectedAddressId) ||
            (addressMode === 'new' &&
              (!fields.firstName ||
                !fields.lastName ||
                !fields.addressLine1 ||
                !fields.city ||
                !fields.postalCode ||
                !fields.countryCode))
          }
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : addressMode === 'new' ? (
            'Save & use this address'
          ) : (
            'Use this address'
          )}
        </Button>
        {confirmedAddressId ? (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Address confirmed
          </span>
        ) : null}
      </div>

      {addressMode === 'new' && (
        <p className="text-xs text-muted-foreground">
          This address will be saved to your account for future orders.
        </p>
      )}
    </form>
  );
}

// ── Order summary card ────────────────────────────────────────────────────────

type Cart = NonNullable<ReturnType<typeof useCart>['cart']>;

function OrderSummaryCard({
  cart,
  formatMoney,
}: {
  cart: Cart;
  formatMoney: (amount: number, currency: string) => string;
}) {
  return (
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
                {formatMoney(item.linePayment, cart.currencyCode)}
              </span>
            </li>
          ))}
        </ul>
        <Separator />
        <Row
          label="Subtotal"
          value={formatMoney(cart.totals.subtotal, cart.currencyCode)}
        />
        <Row
          label="Discounts"
          value={`-${formatMoney(cart.totals.discountTotal, cart.currencyCode)}`}
        />
        <Row
          label="Shipping"
          value={formatMoney(cart.totals.shippingTotal, cart.currencyCode)}
        />
        <Row
          label="Tax"
          value={formatMoney(cart.totals.taxTotal, cart.currencyCode)}
        />
        <Separator />
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(cart.totals.total, cart.currencyCode)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Shared address form fields ────────────────────────────────────────────────

type AddressFormFieldsProps = {
  fields: AddressFields;
  onSetField: <K extends keyof AddressFields>(key: K, value: string) => void;
};

function AddressFormFields({ fields, onSetField }: AddressFormFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name">
          <Input
            value={fields.firstName}
            onChange={(e) => onSetField('firstName', e.target.value)}
            required
          />
        </Field>
        <Field label="Last name">
          <Input
            value={fields.lastName}
            onChange={(e) => onSetField('lastName', e.target.value)}
            required
          />
        </Field>
      </div>
      <Field label="Address line 1">
        <Input
          value={fields.addressLine1}
          onChange={(e) => onSetField('addressLine1', e.target.value)}
          required
        />
      </Field>
      <Field label="Address line 2 (optional)">
        <Input
          value={fields.addressLine2}
          onChange={(e) => onSetField('addressLine2', e.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="City">
          <Input
            value={fields.city}
            onChange={(e) => onSetField('city', e.target.value)}
            required
          />
        </Field>
        <Field label="Postal code">
          <Input
            value={fields.postalCode}
            onChange={(e) => onSetField('postalCode', e.target.value)}
            required
          />
        </Field>
      </div>
      <Field label="Country (ISO)">
        <Input
          value={fields.countryCode}
          onChange={(e) => onSetField('countryCode', e.target.value.toUpperCase())}
          maxLength={2}
          placeholder="US"
          required
        />
      </Field>
    </div>
  );
}

// ── Primitives ────────────────────────────────────────────────────────────────

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
