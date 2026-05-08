'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, MapPin, Settings, User } from 'lucide-react';

import { cn } from '@/lib/utils';

const links = [
  { href: '/account', label: 'Overview', icon: User },
  { href: '/account/orders', label: 'Orders', icon: Package },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/settings', label: 'Settings', icon: Settings },
] as const;

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b pb-px lg:mb-0 lg:flex-col lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === '/account'
            ? pathname === '/account'
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
