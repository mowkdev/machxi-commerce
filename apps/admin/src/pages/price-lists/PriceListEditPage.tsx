import { useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { PriceListForm } from '@/features/price-lists/components/PriceListForm';
import { usePriceList } from '@/features/price-lists/hooks';

export default function PriceListEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: priceList, isPending, isError, error } = usePriceList(id!);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="mx-auto w-full max-w-3xl">
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">
          {error?.message ?? 'Failed to load price list'}
        </p>
      </div>
    );
  }

  if (!priceList) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Price list not found</p>
      </div>
    );
  }

  return <PriceListForm mode="edit" initialData={priceList} />;
}
