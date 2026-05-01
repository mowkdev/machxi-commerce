import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleForm } from "@/features/roles/components/RoleForm";
import { useRole } from "@/features/roles/hooks";

export default function RoleEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: role, isPending, isError, error } = useRole(id!);

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
          {error?.message ?? "Failed to load role"}
        </p>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Role not found</p>
      </div>
    );
  }

  return <RoleForm mode="edit" initialData={role} />;
}
