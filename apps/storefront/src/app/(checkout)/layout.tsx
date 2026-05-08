import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export default function CheckoutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            MachXI
          </Link>
          <Link href="/cart" aria-label="Return to cart">
            <ShoppingBag className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4">
          <Link href="#" className="hover:text-foreground">
            Refund policy
          </Link>
          <Link href="#" className="hover:text-foreground">
            Shipping
          </Link>
          <Link href="#" className="hover:text-foreground">
            Privacy policy
          </Link>
          <Link href="#" className="hover:text-foreground">
            Terms of service
          </Link>
          <Link href="#" className="hover:text-foreground">
            Contact
          </Link>
        </div>
      </footer>
    </div>
  );
}
