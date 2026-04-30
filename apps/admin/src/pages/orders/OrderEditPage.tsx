import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderForm } from "@/features/orders/components/OrderForm";
import { useOrder } from "@/features/orders/hooks";

export default function OrderEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isPending, isError, error } = useOrder(id!);

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
          {error?.message ?? "Failed to load order"}
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  return <OrderForm mode="edit" initialData={order} />;
}
