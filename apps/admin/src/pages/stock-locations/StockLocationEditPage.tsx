import { useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { StockLocationForm } from '@/features/stock-locations/components/StockLocationForm';
import { useStockLocation } from '@/features/stock-locations/hooks';

export default function StockLocationEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: stockLocation, isPending, isError, error } = useStockLocation(id!);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="mx-auto w-full max-w-xl">
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">
          {error?.message ?? 'Failed to load stock location'}
        </p>
      </div>
    );
  }

  if (!stockLocation) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Stock location not found</p>
      </div>
    );
  }

  return <StockLocationForm mode="edit" initialData={stockLocation} />;
}
