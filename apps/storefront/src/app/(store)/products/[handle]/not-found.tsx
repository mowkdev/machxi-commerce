import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function ProductNotFound() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-dashed p-12 text-center">
      <h1 className="text-2xl font-semibold">Product not found</h1>
      <p className="mt-2 text-muted-foreground">
        This product may have been removed or the URL is incorrect.
      </p>
      <Button asChild className="mt-6">
        <Link href="/products">Back to products</Link>
      </Button>
    </div>
  );
}
