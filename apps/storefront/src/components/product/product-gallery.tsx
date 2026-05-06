'use client';

import type { StoreGetProductByHandle200 } from '@repo/storefront-sdk';
import Image from 'next/image';
import * as React from 'react';

import { cn } from '@/lib/utils';

type ProductMedia = StoreGetProductByHandle200['data']['media'][number];

export function ProductGallery({
  images,
  productName,
}: {
  images: ProductMedia[];
  productName: string;
}) {
  const [activeId, setActiveId] = React.useState(images[0]?.id);
  const activeImage = images.find((image) => image.id === activeId) ?? images[0];

  React.useEffect(() => {
    setActiveId(images[0]?.id);
  }, [images]);

  if (!activeImage) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-3xl bg-muted text-muted-foreground">
        No product image
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-muted">
        <Image
          src={activeImage.url}
          alt={activeImage.altText ?? productName}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />
      </div>
      {images.length > 1 ? (
        <div className="grid grid-cols-5 gap-3">
          {images.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveId(image.id)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-xl border bg-muted',
                activeImage.id === image.id && 'ring-2 ring-ring'
              )}
            >
              <Image
                src={image.thumbnailUrl ?? image.url}
                alt={image.altText ?? productName}
                fill
                sizes="10vw"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
