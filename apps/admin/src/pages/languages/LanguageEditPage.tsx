import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageForm } from "@/features/languages/components/LanguageForm";
import { useLanguage } from "@/features/languages/hooks";

export default function LanguageEditPage() {
  const { code } = useParams<{ code: string }>();
  const { data: language, isPending, isError, error } = useLanguage(code!);

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
          {error?.message ?? "Failed to load language"}
        </p>
      </div>
    );
  }

  if (!language) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Language not found</p>
      </div>
    );
  }

  return <LanguageForm mode="edit" initialData={language} />;
}
