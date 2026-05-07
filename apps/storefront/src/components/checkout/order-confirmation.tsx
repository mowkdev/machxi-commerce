'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function OrderConfirmation({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const displayId = searchParams.get('display');

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Thank you</CardTitle>
          <CardDescription>
            Your order has been placed and is awaiting payment confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {displayId ? (
            <p>
              <span className="text-muted-foreground">Order </span>
              <span className="font-semibold">{displayId}</span>
            </p>
          ) : null}
          <p className="break-all text-muted-foreground">
            Reference ID: <span className="font-mono text-foreground">{orderId}</span>
          </p>
          <p className="text-muted-foreground">
            For card payments, completing 3DS may take a moment — you can keep
            this reference handy. For manual invoice orders, watch your email
            for payment instructions.
          </p>
          <Button asChild className="mt-4 w-full">
            <Link href="/products">Continue shopping</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
