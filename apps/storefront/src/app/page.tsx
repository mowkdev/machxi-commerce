import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { FeaturedProducts } from '@/components/product/featured-products';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchProducts } from '@/lib/api';

export default async function HomePage() {
  const response = await fetchProducts({ page: 1, pageSize: 8 });
  const products = response.success ? response.data : [];

  return (
    <div>
      <section className="border-b bg-[radial-gradient(circle_at_top_left,_hsl(var(--muted)),_transparent_32rem)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
          <div className="flex flex-col justify-center">
            <Badge variant="secondary" className="w-fit">
              Spring collection
            </Badge>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
              A clean storefront for modern commerce.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Browse curated products, choose variants, and build a cart with a
              Shopify-style customer experience powered by the storefront SDK.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/products">
                  Shop products <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/cart">View cart</Link>
              </Button>
            </div>
          </div>
          <div className="relative min-h-96 overflow-hidden rounded-[2rem] border bg-muted shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 via-white to-zinc-200" />
            <div className="absolute left-8 top-8 rounded-2xl bg-background/90 p-5 shadow-lg">
              <p className="text-sm text-muted-foreground">Premium basics</p>
              <p className="mt-1 text-2xl font-semibold">Everyday goods</p>
            </div>
            <div className="absolute bottom-8 right-8 h-56 w-44 rounded-3xl bg-zinc-900 shadow-xl" />
            <div className="absolute bottom-20 right-28 h-44 w-36 rounded-3xl bg-zinc-300 shadow-xl" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <FeaturedProducts products={products} />
      </section>
    </div>
  );
}
