import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { ShippingZoneForm } from "@/features/shipping/components/ShippingZoneForm";
import { useShippingZone } from "@/features/shipping/hooks";

export default function ShippingZoneEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: zone, isPending, isError, error } = useShippingZone(id!);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="mx-auto w-full max-w-2xl">
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">
          {error?.message ?? "Failed to load shipping zone"}
        </p>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Shipping zone not found</p>
      </div>
    );
  }

  return <ShippingZoneForm mode="edit" initialData={zone} />;
}
