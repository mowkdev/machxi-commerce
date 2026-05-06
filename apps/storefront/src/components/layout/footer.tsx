import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <Link href="/" className="text-lg font-semibold tracking-tight">
            MachXI
          </Link>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            A minimal commerce theme built for fast product discovery and a
            clean checkout journey.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Shop
          </h2>
          <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <Link href="/products" className="hover:text-foreground">
              All products
            </Link>
            <Link href="/cart" className="hover:text-foreground">
              Cart
            </Link>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Support
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Shipping, returns, and customer account flows can be layered on top
            of the storefront SDK as the API expands.
          </p>
        </div>
      </div>
    </footer>
  );
}
