import { useParams } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';
import { PageForm } from '@/features/cms-pages/components/PageForm';
import { useCmsPage } from '@/features/cms-pages/hooks';

export default function CmsPageEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: page, isPending, isError, error } = useCmsPage(id!);

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
        <p className="text-destructive">{error?.message ?? 'Failed to load page'}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    );
  }

  return <PageForm mode="edit" initialData={page} />;
}
