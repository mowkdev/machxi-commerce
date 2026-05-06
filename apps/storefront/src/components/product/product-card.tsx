import type { StoreListProducts200 } from '@repo/storefront-sdk';
import Image from 'next/image';
import Link from 'next/link';

import { PriceDisplay } from '@/components/product/price-display';
import { Card, CardContent } from '@/components/ui/card';

type ProductListItem = StoreListProducts200['data'][number];

export function ProductCard({ product }: { product: ProductListItem }) {
  const imageUrl = product.thumbnail?.thumbnailUrl ?? product.thumbnail?.url;

  return (
    <Link href={`/products/${product.handle}`} className="group block">
      <Card className="overflow-hidden border-muted shadow-none transition-shadow hover:shadow-md">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.thumbnail?.altText ?? product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <CardContent className="space-y-2 p-4">
          <h3 className="line-clamp-1 font-medium">{product.name}</h3>
          {product.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {product.description}
            </p>
          ) : null}
          <PriceDisplay priceRange={product.priceRange} />
        </CardContent>
      </Card>
    </Link>
  );
}
