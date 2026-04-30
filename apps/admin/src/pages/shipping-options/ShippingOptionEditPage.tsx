import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { ShippingOptionForm } from "@/features/shipping/components/ShippingOptionForm";
import { useShippingOption } from "@/features/shipping/hooks";

export default function ShippingOptionEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: option, isPending, isError, error } = useShippingOption(id!);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="mx-auto w-full max-w-4xl">
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">
          {error?.message ?? "Failed to load shipping option"}
        </p>
      </div>
    );
  }

  if (!option) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Shipping option not found</p>
      </div>
    );
  }

  return <ShippingOptionForm mode="edit" initialData={option} />;
}
