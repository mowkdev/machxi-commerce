import { useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductForm } from '@/features/products/components/ProductForm';
import { useProduct } from '@/features/products/hooks';

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isPending, isError, error } = useProduct(id!);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">{error?.message ?? 'Failed to load product'}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Product not found</p>
      </div>
    );
  }

  return <ProductForm mode="edit" initialData={product} />;
}
