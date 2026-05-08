'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  SdkRequestError,
  storeGetCurrentCustomerQueryKey,
  useStoreLoginCustomer,
} from '@repo/storefront-sdk';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { saveCustomerToken } from '@/lib/sdk';

export function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const login = useStoreLoginCustomer();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await login.mutateAsync({ data: { email, password } });
      if (res.success) {
        saveCustomerToken(res.data.token);
        await qc.invalidateQueries({ queryKey: storeGetCurrentCustomerQueryKey() });
        const returnTo = searchParams.get('returnTo') ?? '/';
        router.push(returnTo);
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
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Sign in to your account to track orders and check out faster.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Email</span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Password</span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
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
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="underline hover:text-foreground">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
