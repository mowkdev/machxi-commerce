import type { Metadata } from 'next';

import { Providers } from '@/providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'Machxi Storefront',
  description: 'A modern ecommerce storefront powered by the Machxi API.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
