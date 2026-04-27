import { useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { TaxClassForm } from '@/features/tax-classes/components/TaxClassForm';
import { useTaxClass } from '@/features/tax-classes/hooks';

export default function TaxClassEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: taxClass, isPending, isError, error } = useTaxClass(id!);

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
        <p className="text-destructive">{error?.message ?? 'Failed to load tax class'}</p>
      </div>
    );
  }

  if (!taxClass) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Tax class not found</p>
      </div>
    );
  }

  return <TaxClassForm mode="edit" initialData={taxClass} />;
}
