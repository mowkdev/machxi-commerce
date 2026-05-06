import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductDetail } from '@/components/product/product-detail';
import { Button } from '@/components/ui/button';
import { fetchProductByHandle } from '@/lib/api';

type ProductPageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { handle } = await params;
  const response = await fetchProductByHandle(handle);

  if (!response.success) {
    return { title: 'Product not found' };
  }

  return {
    title: response.data.name,
    description: response.data.description ?? undefined,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;
  const response = await fetchProductByHandle(handle);

  if (!response.success) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <nav className="mb-8">
        <Button asChild variant="ghost" size="sm">
          <Link href="/products">&larr; Back to products</Link>
        </Button>
      </nav>
      <ProductDetail product={response.data} />
    </div>
  );
}
