'use client';

import Link from 'next/link';
import * as React from 'react';
import {
  SdkRequestError,
  storeGetCurrentCustomerQueryKey,
  useStoreGetOrderConfirmation,
  useStoreRegisterFromOrder,
} from '@repo/storefront-sdk';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Package } from 'lucide-react';
import { useFormatMoney } from '@/lib/format-money';

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
import { saveCustomerToken } from '@/lib/sdk';

export function OrderConfirmation({ orderId }: { orderId: string }) {
  const formatMoney = useFormatMoney();
  const { data, isLoading, isError } = useStoreGetOrderConfirmation(orderId, {
    query: { retry: 1 },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-16">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data?.success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-muted-foreground">
          Order not found. It may still be processing.
        </p>
        <Button asChild className="mt-6">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  const order = data.data;
  const isGuest = order.customerId === null;
  const shippingAddr = order.shippingAddressSnapshot as Record<string, unknown> | null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      {/* Thank you header */}
      <div className="flex items-start gap-4">
        <CheckCircle2 className="mt-1 h-8 w-8 shrink-0 text-green-600" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Thank you for your order!
          </h1>
          <p className="text-sm text-muted-foreground">
            Order{' '}
            <span className="font-mono font-medium text-foreground">
              {order.displayId}
            </span>{' '}
            has been placed.
          </p>
          {isGuest && order.guestEmail ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Confirmation sent to{' '}
              <span className="font-medium text-foreground">{order.guestEmail}</span>
            </p>
          ) : null}
        </div>
      </div>

      {/* Order items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Items ordered
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="divide-y">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="h-12 w-12 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {item.title}
                    {item.variantTitle ? (
                      <span className="font-normal text-muted-foreground">
                        {' '}
                        — {item.variantTitle}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground">Qty {item.quantity}</p>
                </div>
                <span className="shrink-0 font-medium">
                  {formatMoney(item.finalUnitPrice * item.quantity, order.currencyCode)}
                </span>
              </li>
            ))}
          </ul>
          <Separator />
          <div className="space-y-1.5">
            <OrderRow label="Subtotal" value={formatMoney(order.subtotal, order.currencyCode)} />
            {order.discountTotal > 0 ? (
              <OrderRow
                label="Discounts"
                value={`-${formatMoney(order.discountTotal, order.currencyCode)}`}
              />
            ) : null}
            <OrderRow label="Shipping" value={formatMoney(order.shippingTotal, order.currencyCode)} />
            <OrderRow label="Tax" value={formatMoney(order.taxTotal, order.currencyCode)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatMoney(order.totalAmount, order.currencyCode)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Shipping address */}
      {shippingAddr ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shipping to</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              {String(shippingAddr.firstName ?? '')} {String(shippingAddr.lastName ?? '')}
            </p>
            <p>{String(shippingAddr.addressLine1 ?? '')}</p>
            {shippingAddr.addressLine2 ? <p>{String(shippingAddr.addressLine2)}</p> : null}
            <p>
              {String(shippingAddr.city ?? '')}, {String(shippingAddr.postalCode ?? '')}{' '}
              {String(shippingAddr.countryCode ?? '')}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Post-purchase registration prompt (guests only) */}
      {isGuest ? (
        <GuestRegistrationPrompt orderId={orderId} guestEmail={order.guestEmail} />
      ) : null}

      <Button asChild variant="outline" className="w-full">
        <Link href="/products">Continue shopping</Link>
      </Button>
    </div>
  );
}

// ── Guest registration prompt ────────────────────────────────────────────────

function GuestRegistrationPrompt({
  orderId,
  guestEmail,
}: {
  orderId: string;
  guestEmail: string | null;
}) {
  const qc = useQueryClient();
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const register = useStoreRegisterFromOrder();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      const res = await register.mutateAsync({
        data: { orderId, password },
      });
      if (res.success) {
        saveCustomerToken(res.data.token);
        qc.invalidateQueries({ queryKey: storeGetCurrentCustomerQueryKey() });
        setDone(true);
      }
    } catch (err) {
      setError(
        err instanceof SdkRequestError ? err.message : 'Could not create account',
      );
    }
  }

  if (done) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-3 py-4 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          <p>
            <span className="font-medium text-green-800">Account created!</span>{' '}
            <span className="text-green-700">
              You&apos;re now signed in. Your order and address have been saved.
            </span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Save your details</CardTitle>
        <CardDescription>
          Create a free account to track your orders and check out faster next
          time
          {guestEmail ? ` using ${guestEmail}` : ''}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <RegistrationField label="Password (min 12 characters)">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={12}
              required
            />
          </RegistrationField>
          <RegistrationField label="Confirm password">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </RegistrationField>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={register.isPending}>
            {register.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Your shipping address and this order will be linked automatically.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function OrderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function RegistrationField({
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
