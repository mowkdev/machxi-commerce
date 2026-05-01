import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  SdkRequestError,
  adminCreateRole,
  adminDeleteRole,
  adminGetRoleQueryKey,
  adminListPermissionsQueryKey,
  adminListRolesQueryKey,
  adminUpdateRole,
  useAdminGetRole,
  useAdminListPermissions,
  useAdminListRoles,
} from "@repo/admin-sdk";
import type {
  CreateRoleBody,
  PermissionSummary,
  RoleDetail,
  RoleListItem,
  UpdateRoleBody,
} from "@repo/types/admin";

export const rolesQueryPrefix = adminListRolesQueryKey();
export const permissionsQueryPrefix = adminListPermissionsQueryKey();

export function useRole(id: string) {
  return useAdminGetRole<RoleDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data,
    },
  });
}

export function useRoleOptions() {
  return useAdminListRoles<RoleListItem[]>(
    { pageSize: 200, sortBy: "name", sortOrder: "asc" },
    {
      query: {
        staleTime: 5 * 60 * 1000,
        select: (response) => response.data,
      },
    },
  );
}

export function usePermissions() {
  return useAdminListPermissions<PermissionSummary[]>({
    query: {
      staleTime: 5 * 60 * 1000,
      select: (response) => response.data,
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, SdkRequestError, CreateRoleBody>({
    mutationFn: async (body) => {
      const res = await adminCreateRole(body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rolesQueryPrefix });
      toast.success("Role created");
      navigate(`/settings/team/roles/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create role");
    },
  });
}

export function useUpdateRole(id: string) {
  const queryClient = useQueryClient();

  return useMutation<RoleDetail, SdkRequestError, UpdateRoleBody>({
    mutationFn: async (body) => {
      const res = await adminUpdateRole(id, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryPrefix });
      queryClient.invalidateQueries({ queryKey: adminGetRoleQueryKey(id) });
      toast.success("Role saved");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save role");
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (id) => {
      await adminDeleteRole(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryPrefix });
      toast.success("Role deleted");
      navigate("/settings/team/roles");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete role");
    },
  });
}
