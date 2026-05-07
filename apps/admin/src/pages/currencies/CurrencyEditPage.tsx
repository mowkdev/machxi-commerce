import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyForm } from "@/features/currencies/components/CurrencyForm";
import { useCurrency } from "@/features/currencies/hooks";

export default function CurrencyEditPage() {
  const { code } = useParams<{ code: string }>();
  const { data: currency, isPending, isError, error } = useCurrency(code!);

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
        <p className="text-destructive">
          {error?.message ?? "Failed to load currency"}
        </p>
      </div>
    );
  }

  if (!currency) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Currency not found</p>
      </div>
    );
  }

  return <CurrencyForm mode="edit" initialData={currency} />;
}
