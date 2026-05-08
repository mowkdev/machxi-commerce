'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  useStoreSetCartAddresses,
  useStoreSetCartEmail,
} from '@repo/storefront-sdk';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, ShoppingBag } from 'lucide-react';

import { ContactSection } from '@/components/checkout/contact-section';
import {
  DeliverySection,
  blankAddress,
  type AddressFields,
} from '@/components/checkout/delivery-section';
import { ShippingMethodSection } from '@/components/checkout/shipping-method-section';
import { PaymentSection } from '@/components/checkout/payment-section';
import { OrderSummarySidebar } from '@/components/checkout/order-summary-sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/providers/cart-provider';
import { useFormatMoney } from '@/lib/format-money';
import { removeCustomerToken } from '@/lib/sdk';

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
  const formatMoney = useFormatMoney();
  const {
    cart,
    cartId,
    isLoading: cartLoading,
    clearCart,
  } = useCart();

  // ── Auth ───────────────────────────────────────────────────────────────────
  const customerQuery = useStoreGetCurrentCustomer({
    query: { retry: false, retryOnMount: false },
  });
  const customer = customerQuery.data?.success
    ? customerQuery.data.data
    : null;
  const isAuthenticated = Boolean(customer);

  // ── Saved addresses (registered users) ─────────────────────────────────────
  const addressesQuery = useStoreListAddresses({
    query: { enabled: isAuthenticated, retry: false },
  });
  const savedAddresses = addressesQuery.data?.success
    ? addressesQuery.data.data
    : [];

  // ── Auto-attach logged-in customer to guest cart ───────────────────────────
  const attachCustomer = useStoreAttachCustomerToCart();
  const [isAttaching, setIsAttaching] = React.useState(false);

  React.useEffect(() => {
    if (
      !customer ||
      !cartId ||
      !cart ||
      cart.customerId !== null ||
      isAttaching
    )
      return;
    setIsAttaching(true);
    attachCustomer.mutate(
      { id: cartId },
      {
        onSettled: async () => {
          await qc.invalidateQueries({
            queryKey: storeGetCartQueryKey(cartId),
          });
          setIsAttaching(false);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, cartId, cart?.customerId]);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [email, setEmail] = React.useState('');
  const [fields, setFields] = React.useState<AddressFields>(blankAddress);
  const [selectedAddressId, setSelectedAddressId] = React.useState<
    string | null
  >(null);
  const [selectedPaymentCode, setSelectedPaymentCode] = React.useState<
    string | null
  >(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [payContext, setPayContext] = React.useState<{
    orderId: string;
    displayId: string;
    clientSecret: string;
    publishableKey: string;
  } | null>(null);

  function setField<K extends keyof AddressFields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  // ── Init: default saved address for authenticated users (runs once) ───────
  const addressInitialized = React.useRef(false);
  React.useEffect(() => {
    if (addressInitialized.current || !isAuthenticated || savedAddresses.length === 0)
      return;
    const def =
      savedAddresses.find((a) => a.isDefaultShipping) ?? savedAddresses[0];
    if (def) {
      setSelectedAddressId(def.id);
      addressInitialized.current = true;
    }
  }, [isAuthenticated, savedAddresses]);

  // ── Payment methods ────────────────────────────────────────────────────────
  const methodsQuery = useStoreListPaymentMethods();
  const methods = React.useMemo(() => {
    const raw = methodsQuery.data?.success ? methodsQuery.data.data : [];
    return [...raw].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [methodsQuery.data]);

  React.useEffect(() => {
    if (methods.length === 0 || selectedPaymentCode) return;
    setSelectedPaymentCode(methods[0]!.code);
  }, [methods, selectedPaymentCode]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const setCartEmail = useStoreSetCartEmail();
  const setAddresses = useStoreSetCartAddresses();
  const createAddress = useStoreCreateAddress();
  const completeCart = useStoreCompleteCart();

  // ── Derived state ──────────────────────────────────────────────────────────
  const isReady =
    !cartLoading && !!cartId && !customerQuery.isLoading && !isAttaching;

  const formFieldsComplete = Boolean(
    fields.firstName &&
      fields.lastName &&
      fields.addressLine1 &&
      fields.city &&
      fields.postalCode &&
      fields.countryCode,
  );

  const addressComplete = selectedAddressId
    ? true
    : formFieldsComplete;

  const isSubmitting =
    setCartEmail.isPending ||
    setAddresses.isPending ||
    createAddress.isPending ||
    completeCart.isPending;

  // ── Pay Now handler ────────────────────────────────────────────────────────

  function sanitizePhone(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Accept E.164 format only; strip anything else to null
    return /^\+[1-9][0-9]{1,14}$/.test(trimmed) ? trimmed : null;
  }

  async function onPayNow() {
    setFormError(null);
    if (!cartId || !selectedPaymentCode) return;

    try {
      // 1. Save guest email
      if (!isAuthenticated && email) {
        await setCartEmail.mutateAsync({ id: cartId, data: { email } });
      }

      // 2. Save address
      if (isAuthenticated) {
        if (selectedAddressId) {
          await setAddresses.mutateAsync({
            id: cartId,
            data: { shippingAddressId: selectedAddressId },
          });
        } else {
          const cc = fields.countryCode.trim().toUpperCase();
          if (cc.length !== 2) {
            setFormError('Please select a country.');
            return;
          }
          const created = await createAddress.mutateAsync({
            data: {
              firstName: fields.firstName.trim(),
              lastName: fields.lastName.trim(),
              company: null,
              phone: sanitizePhone(fields.phone),
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
        }
      } else {
        const cc = fields.countryCode.trim().toUpperCase();
        if (!cc || cc.length !== 2) {
          setFormError('Please select a country.');
          return;
        }
        await setAddresses.mutateAsync({
          id: cartId,
          data: {
            guestShippingAddress: {
              firstName: fields.firstName.trim(),
              lastName: fields.lastName.trim(),
              company: null,
              phone: sanitizePhone(fields.phone),
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

      // 3. Complete cart
      const res = await completeCart.mutateAsync({
        id: cartId,
        data: { paymentProviderCode: selectedPaymentCode },
      });
      if (!res.success) return;

      const { orderId, displayId, payment, paymentSessionError } = res.data;
      const payload = payment.clientPayload;

      clearCart();

      // 4. Handle Stripe
      if (payment.kind === 'automatic' && isStripePayload(payload)) {
        const pk =
          payload.publishableKey?.trim() ||
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
          '';
        if (!pk) {
          setFormError('Stripe publishable key is missing.');
          router.push(
            `/order/confirmation/${orderId}?display=${encodeURIComponent(displayId)}`,
          );
          return;
        }
        if (paymentSessionError) {
          setFormError(`Payment session error: ${paymentSessionError}`);
        }
        setPayContext({ orderId, displayId, clientSecret: payload.clientSecret, publishableKey: pk });
        return;
      }

      // 5. Non-Stripe → redirect to confirmation
      router.push(
        `/order/confirmation/${orderId}?display=${encodeURIComponent(displayId)}`,
      );
    } catch (err) {
      setFormError(
        err instanceof SdkRequestError ? err.message : 'Checkout failed',
      );
    }
  }

  function handleSignOut() {
    removeCustomerToken();
    qc.resetQueries({ queryKey: storeGetCurrentCustomerQueryKey() });
    setSelectedAddressId(null);
    setFields(blankAddress);
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!isReady) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-8 lg:grid lg:grid-cols-[1fr_380px] lg:gap-12">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="hidden lg:block">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // ── Empty cart ─────────────────────────────────────────────────────────────
  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-6 text-2xl font-semibold">Nothing to check out</h1>
        <p className="mt-2 text-muted-foreground">
          Add products to your cart before continuing.
        </p>
        <Button asChild className="mt-6">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  // ── Validation for Pay Now button ──────────────────────────────────────────
  const canSubmit =
    !isSubmitting &&
    !payContext &&
    selectedPaymentCode &&
    addressComplete &&
    (isAuthenticated || email);

  // ── Main checkout layout ───────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 lg:grid lg:grid-cols-[1fr_380px] lg:gap-12">
      {/* Left column: form sections */}
      <div className={`space-y-6 ${payContext ? 'pointer-events-none opacity-50' : ''}`}>
        <ContactSection
          email={email}
          setEmail={setEmail}
          isAuthenticated={isAuthenticated}
          customerEmail={customer?.email}
          onSignOut={handleSignOut}
        />

        <Separator />

        <DeliverySection
          fields={fields}
          setField={setField}
          isAuthenticated={isAuthenticated}
          savedAddresses={savedAddresses}
          addressesLoading={addressesQuery.isLoading}
          selectedAddressId={selectedAddressId}
          onSelectSavedAddress={setSelectedAddressId}
        />

        <Separator />

        <ShippingMethodSection
          shippingTotal={cart.totals.shippingTotal}
          currencyCode={cart.currencyCode}
          formatMoney={formatMoney}
          addressComplete={addressComplete}
        />

        <Separator />

        <PaymentSection
          methods={methods}
          methodsLoading={methodsQuery.isLoading}
          selectedCode={selectedPaymentCode}
          setSelectedCode={setSelectedPaymentCode}
          payContext={payContext}
        />

        {formError && (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}

        {!payContext && (
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!canSubmit}
            onClick={() => void onPayNow()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              'Pay now'
            )}
          </Button>
        )}
      </div>

      {/* Right column: order summary (desktop) */}
      <aside className="hidden lg:block">
        <div className="sticky top-6">
          <OrderSummarySidebar
            cart={cart}
            cartId={cartId!}
            formatMoney={formatMoney}
          />
        </div>
      </aside>

      {/* Mobile order summary (below form) */}
      <div className="mt-8 lg:hidden">
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between rounded-lg border p-4 text-sm font-medium">
            <span>Show order summary</span>
            <span className="font-semibold">
              {formatMoney(cart.totals.total, cart.currencyCode)}
            </span>
          </summary>
          <div className="mt-4">
            <OrderSummarySidebar
              cart={cart}
              cartId={cartId!}
              formatMoney={formatMoney}
            />
          </div>
        </details>
      </div>
    </div>
  );
}
