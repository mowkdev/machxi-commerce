import type { StoreListProducts200 } from '@repo/storefront-sdk';

import { ProductCard } from '@/components/product/product-card';
import { Skeleton } from '@/components/ui/skeleton';

type ProductListItem = StoreListProducts200['data'][number];

export function ProductGrid({ products }: { products: ProductListItem[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <h2 className="text-lg font-semibold">No products found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Try changing filters or check back after new products are published.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
