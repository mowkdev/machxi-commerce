import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { FulfillmentForm } from "@/features/fulfillments/components/FulfillmentForm";
import { useFulfillment } from "@/features/fulfillments/hooks";

export default function FulfillmentEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: fulfillment, isPending, isError, error } = useFulfillment(id!);

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
          {error?.message ?? "Failed to load fulfillment"}
        </p>
      </div>
    );
  }

  if (!fulfillment) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Fulfillment not found</p>
      </div>
    );
  }

  return <FulfillmentForm mode="edit" initialData={fulfillment} />;
}
