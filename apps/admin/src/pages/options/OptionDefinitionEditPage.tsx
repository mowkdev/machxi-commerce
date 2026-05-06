import { useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { OptionDefinitionForm } from '@/features/option-definitions/components/OptionDefinitionForm';
import { useOptionDefinition } from '@/features/option-definitions/hooks';

export default function OptionDefinitionEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: definition, isPending, isError, error } = useOptionDefinition(id!);

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
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">{error?.message ?? 'Failed to load option definition'}</p>
      </div>
    );
  }

  if (!definition) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Option definition not found</p>
      </div>
    );
  }

  return <OptionDefinitionForm mode="edit" initialData={definition} />;
}
