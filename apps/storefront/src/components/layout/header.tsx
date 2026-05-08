'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  storeGetCurrentCustomerQueryKey,
  useStoreGetCurrentCustomer,
} from '@repo/storefront-sdk';
import { useQueryClient } from '@tanstack/react-query';

import { CartDrawer } from '@/components/cart/cart-drawer';
import { CurrencySwitcher } from '@/components/layout/currency-switcher';
import { Button } from '@/components/ui/button';
import { removeCustomerToken } from '@/lib/sdk';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop' },
];

function AuthNav() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useStoreGetCurrentCustomer({
    query: { retry: false, retryOnMount: false },
  });
  const customer = data?.success ? data.data : null;

  if (isLoading) return null;

  if (!customer) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href="/auth/login">Sign in</Link>
      </Button>
    );
  }

  function handleLogout() {
    removeCustomerToken();
    qc.resetQueries({ queryKey: storeGetCurrentCustomerQueryKey() });
    router.push('/');
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <Button asChild variant="ghost" size="sm">
        <Link href="/account">{customer.firstName}</Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        Sign out
      </Button>
    </div>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            MachXI
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <CurrencySwitcher />
          <AuthNav />
          <CartDrawer />
        </div>
      </div>
    </header>
  );
}
