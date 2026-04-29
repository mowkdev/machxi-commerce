import { useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryForm } from '@/features/categories/components/CategoryForm';
import { useCategory } from '@/features/categories/hooks';

export default function CategoryEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: category, isPending, isError, error } = useCategory(id!);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="mx-auto w-full max-w-3xl">
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">{error?.message ?? 'Failed to load category'}</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Category not found</p>
      </div>
    );
  }

  return <CategoryForm mode="edit" initialData={category} />;
}
