import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FormContentLayout } from "@/components/form-content-layout";
import { FormPageShell } from "@/components/form-page-shell";
import { RecordTimestamps } from "@/components/record-timestamps";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type {
  CreateRoleBody,
  PermissionSummary,
  RoleDetail,
  UpdateRoleBody,
} from "@repo/types/admin";
import {
  useCreateRole,
  useDeleteRole,
  usePermissions,
  useUpdateRole,
} from "../hooks";

interface RoleFormProps {
  mode: "create" | "edit";
  initialData?: RoleDetail;
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function groupByResource(
  permissions: PermissionSummary[],
): Array<{ resource: string; items: PermissionSummary[] }> {
  const map = new Map<string, PermissionSummary[]>();
  for (const p of permissions) {
    const list = map.get(p.resource) ?? [];
    list.push(p);
    map.set(p.resource, list);
  }
  return Array.from(map.entries())
    .map(([resource, items]) => ({
      resource,
      items: items.sort((a, b) => a.action.localeCompare(b.action)),
    }))
    .sort((a, b) => a.resource.localeCompare(b.resource));
}

export function RoleForm({ mode, initialData }: RoleFormProps) {
  const navigate = useNavigate();
  const isCreateMode = mode === "create";
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole(initialData?.id ?? "");
  const deleteMutation = useDeleteRole();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [permissionIds, setPermissionIds] = useState<string[]>(
    initialData?.permissions.map((p) => p.id) ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description ?? "");
      setPermissionIds(initialData.permissions.map((p) => p.id));
    }
  }, [initialData]);

  const permissionsQuery = usePermissions();
  const allPermissions = useMemo(
    () => permissionsQuery.data ?? [],
    [permissionsQuery.data],
  );
  const grouped = useMemo(
    () => groupByResource(allPermissions),
    [allPermissions],
  );

  const togglePermission = (id: string) => {
    setPermissionIds((current) =>
      current.includes(id)
        ? current.filter((pid) => pid !== id)
        : [...current, id],
    );
  };

  const toggleResource = (resource: string) => {
    const group = grouped.find((g) => g.resource === resource);
    if (!group) return;
    const ids = group.items.map((i) => i.id);
    const allChecked = ids.every((id) => permissionIds.includes(id));
    setPermissionIds((current) => {
      if (allChecked) {
        return current.filter((id) => !ids.includes(id));
      }
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const title = isCreateMode ? "New role" : initialData?.name || "Role";

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (isCreateMode) {
      const body: CreateRoleBody = {
        name: name.trim(),
        description: optionalText(description),
        permissionIds,
      };
      createMutation.mutate(body);
    } else {
      const body: UpdateRoleBody = {
        name: name.trim(),
        description: optionalText(description),
        permissionIds,
      };
      updateMutation.mutate(body);
    }
  };

  return (
    <FormPageShell
      title={title}
      onBack={() => navigate("/settings/team/roles")}
      onSubmit={onSubmit}
      submitLabel={isPending ? "Saving..." : isCreateMode ? "Create" : "Save"}
      isSubmitting={isPending}
    >
      <FormContentLayout maxWidth="2xl">
        {error ? (
          <p className="rounded-md border border-destructive p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              A role groups a set of permissions. Assign roles to users in
              Settings → Users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="role-name">Name</FieldLabel>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Catalog manager"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="role-description">Description</FieldLabel>
                <Textarea
                  id="role-description"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional summary of what this role can do"
                />
                <FieldDescription>
                  Describe the role&apos;s scope — visible to other admins.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions ({permissionIds.length})</CardTitle>
            <CardDescription>
              Permissions are grouped by resource. Click a resource title to
              toggle its full set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {permissionsQuery.isPending ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No permissions are defined yet. Seed the permissions table to
                manage role grants here.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {grouped.map((group) => {
                  const ids = group.items.map((i) => i.id);
                  const allChecked = ids.every((id) =>
                    permissionIds.includes(id),
                  );
                  const someChecked =
                    !allChecked && ids.some((id) => permissionIds.includes(id));
                  return (
                    <div
                      key={group.resource}
                      className="rounded-md border p-3"
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <Checkbox
                          id={`role-resource-${group.resource}`}
                          checked={
                            allChecked
                              ? true
                              : someChecked
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={() =>
                            toggleResource(group.resource)
                          }
                        />
                        <FieldLabel
                          htmlFor={`role-resource-${group.resource}`}
                          className="text-sm font-semibold"
                        >
                          {group.resource}
                        </FieldLabel>
                      </div>
                      <div className="ml-6 grid gap-2 sm:grid-cols-2">
                        {group.items.map((permission) => {
                          const inputId = `role-permission-${permission.id}`;
                          const checked = permissionIds.includes(permission.id);
                          return (
                            <label
                              key={permission.id}
                              htmlFor={inputId}
                              className="flex cursor-pointer items-start gap-2 rounded-md p-1 text-sm hover:bg-muted/50"
                            >
                              <Checkbox
                                id={inputId}
                                checked={checked}
                                onCheckedChange={() =>
                                  togglePermission(permission.id)
                                }
                              />
                              <span>
                                <span className="font-medium">
                                  {permission.action}
                                </span>
                                {permission.description ? (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    — {permission.description}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {!isCreateMode && initialData ? (
          <Card>
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>
                Deleting a role removes it from all users currently assigned.
                {initialData.userCount > 0
                  ? ` ${initialData.userCount} user(s) currently have this role.`
                  : null}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger
                  type="button"
                  className={buttonVariants({ variant: "destructive" })}
                >
                  Delete role
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete role?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This cannot be undone. Users assigned to this role will
                      lose its permissions immediately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(initialData.id)}
                    >
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ) : null}
        {!isCreateMode && initialData ? (
          <RecordTimestamps record={initialData} />
        ) : null}
      </FormContentLayout>
    </FormPageShell>
  );
}
