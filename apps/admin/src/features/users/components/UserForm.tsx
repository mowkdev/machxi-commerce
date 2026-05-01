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
import { Badge } from "@/components/ui/badge";
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
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type {
  CreateUserBody,
  UpdateUserBody,
  UserDetail,
} from "@repo/types/admin";
import { useRoleOptions } from "@/features/roles/hooks";
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
} from "../hooks";

interface UserFormProps {
  mode: "create" | "edit";
  initialData?: UserDetail;
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function UserForm({ mode, initialData }: UserFormProps) {
  const navigate = useNavigate();
  const isCreateMode = mode === "create";
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(initialData?.id ?? "");
  const deleteMutation = useDeleteUser();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [email, setEmail] = useState(initialData?.email ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [image, setImage] = useState(initialData?.image ?? "");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [password, setPassword] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>(
    initialData?.roles.map((r) => r.id) ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setEmail(initialData.email);
      setName(initialData.name ?? "");
      setImage(initialData.image ?? "");
      setIsActive(initialData.isActive);
      setRoleIds(initialData.roles.map((r) => r.id));
    }
  }, [initialData]);

  const rolesQuery = useRoleOptions();
  const allRoles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);

  const toggleRole = (id: string) => {
    setRoleIds((current) =>
      current.includes(id)
        ? current.filter((rid) => rid !== id)
        : [...current, id],
    );
  };

  const title = isCreateMode
    ? "New user"
    : (initialData?.name?.trim() || initialData?.email || "User");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (image.trim() && !/^https?:\/\//i.test(image.trim())) {
      setError("Image must be a valid URL beginning with http(s)://.");
      return;
    }
    if (isCreateMode && password.length < 12) {
      setError("Initial password must be at least 12 characters.");
      return;
    }
    if (!isCreateMode && password.length > 0 && password.length < 12) {
      setError("Password must be at least 12 characters or left blank.");
      return;
    }

    if (isCreateMode) {
      const body: CreateUserBody = {
        email: email.trim(),
        name: optionalText(name),
        image: optionalText(image),
        isActive,
        password,
        roleIds,
      };
      createMutation.mutate(body);
    } else {
      const body: UpdateUserBody = {
        email: email.trim(),
        name: optionalText(name),
        image: optionalText(image),
        isActive,
        roleIds,
      };
      if (password.length >= 12) body.password = password;
      updateMutation.mutate(body);
    }
  };

  return (
    <FormPageShell
      title={title}
      onBack={() => navigate("/settings/team/users")}
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
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Account details for this admin user.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="user-email">Email</FieldLabel>
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="user@example.com"
                  autoComplete="email"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="user-name">Name</FieldLabel>
                <Input
                  id="user-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Optional display name"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="user-image">Avatar URL</FieldLabel>
                <Input
                  id="user-image"
                  type="url"
                  value={image}
                  onChange={(event) => setImage(event.target.value)}
                  placeholder="https://..."
                />
                <FieldDescription>
                  Optional avatar image URL displayed in the admin UI.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="user-password">
                  {isCreateMode ? "Initial password" : "New password"}
                </FieldLabel>
                <Input
                  id="user-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    isCreateMode
                      ? "Minimum 12 characters"
                      : "Leave blank to keep current password"
                  }
                />
                <FieldDescription>
                  {isCreateMode
                    ? "Minimum 12 characters. The API stores only a password hash."
                    : "Leave blank to keep the current password unchanged."}
                </FieldDescription>
              </Field>
              <Field orientation="horizontal">
                <Switch
                  id="user-active"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <FieldContent>
                  <FieldTitle>Active</FieldTitle>
                  <FieldDescription>
                    Inactive users cannot sign in to the admin app.
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>
              Assign one or more roles to grant permissions to this user.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rolesQuery.isPending ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : allRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No roles defined yet. Create roles in Settings → Roles.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {allRoles.map((role) => {
                  const checked = roleIds.includes(role.id);
                  const inputId = `user-role-${role.id}`;
                  return (
                    <label
                      key={role.id}
                      htmlFor={inputId}
                      className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={inputId}
                        checked={checked}
                        onCheckedChange={() => toggleRole(role.id)}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{role.name}</span>
                        {role.description ? (
                          <span className="text-xs text-muted-foreground">
                            {role.description}
                          </span>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            {!isCreateMode && initialData && initialData.roles.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {initialData.roles.map((role) => (
                  <Badge key={role.id} variant="secondary">
                    {role.name}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {!isCreateMode && initialData ? (
          <Card>
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>
                Deleting a user removes their role assignments and any sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger
                  type="button"
                  className={buttonVariants({ variant: "destructive" })}
                >
                  Delete user
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete user?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This cannot be undone. The user will lose all admin
                      access immediately.
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
