import type { StoreListProducts200 } from '@repo/storefront-sdk';
import Link from 'next/link';

import { ProductGrid } from '@/components/product/product-grid';
import { Button } from '@/components/ui/button';

type ProductListItem = StoreListProducts200['data'][number];

export function FeaturedProducts({ products }: { products: ProductListItem[] }) {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Featured collection
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            New arrivals
          </h2>
        </div>
        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href="/products">View all</Link>
        </Button>
      </div>
      <ProductGrid products={products} />
      <Button asChild variant="outline" className="w-full sm:hidden">
        <Link href="/products">View all products</Link>
      </Button>
    </div>
  );
}
