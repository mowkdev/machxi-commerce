'use client';

import type { StoreGetProductByHandle200 } from '@repo/storefront-sdk';
import * as React from 'react';

import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { PriceDisplay } from '@/components/product/price-display';
import { ProductGallery } from '@/components/product/product-gallery';
import { VariantSelector } from '@/components/product/variant-selector';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type Product = StoreGetProductByHandle200['data'];

export function ProductDetail({ product }: { product: Product }) {
  const [selectedValueIds, setSelectedValueIds] = React.useState<
    Record<string, string>
  >(() => {
    const firstAvailableVariant =
      product.variants.find((variant) => variant.inStock) ??
      product.variants[0];
    return Object.fromEntries(
      product.options.map((option) => [
        option.id,
        option.values.find((value) =>
          firstAvailableVariant?.optionValueIds.includes(value.id)
        )?.id ?? option.values[0]?.id,
      ])
    );
  });

  const selectedVariant =
    product.variants.find((variant) =>
      Object.values(selectedValueIds).every((valueId) =>
        variant.optionValueIds.includes(valueId)
      )
    ) ?? product.variants[0];

  const media =
    selectedVariant?.media && selectedVariant.media.length > 0
      ? selectedVariant.media
      : product.media;
  const outOfStock = !selectedVariant?.inStock;

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <ProductGallery images={media} productName={product.name} />
      <div className="flex flex-col">
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {product.categories.map((category) => (
              <Badge key={category.id} variant="secondary">
                {category.name}
              </Badge>
            ))}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">
            {product.name}
          </h1>
          <div className="mt-4 text-xl">
            <PriceDisplay price={selectedVariant?.price ?? null} />
          </div>
        </div>

        <Separator className="my-8" />

        <VariantSelector
          options={product.options}
          selectedValueIds={selectedValueIds}
          onSelect={(optionId, valueId) =>
            setSelectedValueIds((current) => ({
              ...current,
              [optionId]: valueId,
            }))
          }
        />

        <div className="mt-8 space-y-3">
          <AddToCartButton
            variantId={selectedVariant?.id}
            disabled={outOfStock}
          />
          <p className="text-sm text-muted-foreground">
            {outOfStock
              ? 'This variant is currently out of stock.'
              : `${selectedVariant?.availableQuantity ?? 0} available`}
          </p>
        </div>

        {product.description ? (
          <>
            <Separator className="my-8" />
            <div className="prose prose-zinc max-w-none">
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="mt-3 whitespace-pre-line text-muted-foreground">
                {product.description}
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
