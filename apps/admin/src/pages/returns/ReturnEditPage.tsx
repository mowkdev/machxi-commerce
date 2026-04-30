import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { ReturnForm } from "@/features/returns/components/ReturnForm";
import { useReturn } from "@/features/returns/hooks";

export default function ReturnEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: orderReturn, isPending, isError, error } = useReturn(id!);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">
          {error?.message ?? "Failed to load return"}
        </p>
      </div>
    );
  }

  if (!orderReturn) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Return not found</p>
      </div>
    );
  }

  return <ReturnForm mode="edit" initialData={orderReturn} />;
}
