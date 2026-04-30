import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerForm } from "@/features/customers/components/CustomerForm";
import { useCustomer } from "@/features/customers/hooks";

export default function CustomerEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isPending, isError, error } = useCustomer(id!);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="mx-auto w-full max-w-3xl">
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">
          {error?.message ?? "Failed to load customer"}
        </p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    );
  }

  return <CustomerForm mode="edit" initialData={customer} />;
}
