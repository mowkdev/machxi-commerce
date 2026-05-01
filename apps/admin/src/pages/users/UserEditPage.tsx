import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { UserForm } from "@/features/users/components/UserForm";
import { useUser } from "@/features/users/hooks";

export default function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: user, isPending, isError, error } = useUser(id!);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="mx-auto w-full max-w-2xl">
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">
          {error?.message ?? "Failed to load user"}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  return <UserForm mode="edit" initialData={user} />;
}
