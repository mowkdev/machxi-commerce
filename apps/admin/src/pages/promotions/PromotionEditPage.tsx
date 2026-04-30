import { useParams } from 'react-router-dom';
import { PromotionForm } from '@/features/promotions/components/PromotionForm';
import { usePromotion } from '@/features/promotions/hooks';
import { Skeleton } from '@/components/ui/skeleton';

export default function PromotionEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: promotion, isPending, isError, error } = usePromotion(id!);

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
        <p className="text-destructive">{error?.message ?? 'Failed to load promotion'}</p>
      </div>
    );
  }

  if (!promotion) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Promotion not found</p>
      </div>
    );
  }

  return <PromotionForm mode="edit" initialData={promotion} />;
}
