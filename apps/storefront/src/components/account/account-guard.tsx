'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useStoreGetCurrentCustomer } from '@repo/storefront-sdk';

import { Skeleton } from '@/components/ui/skeleton';

export function AccountGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, isLoading } = useStoreGetCurrentCustomer({
    query: { retry: false },
  });

  const isAuthenticated = data?.success === true;

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/auth/login?returnTo=${encodeURIComponent('/account')}`);
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-12">
          <div className="mb-6 flex gap-1 overflow-x-auto border-b pb-px lg:mb-0 lg:flex-col lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-md lg:w-full" />
            ))}
          </div>
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
            <div className="space-y-4 pt-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
            <div className="space-y-4 pt-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
