import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  SdkRequestError,
  adminCreateUser,
  adminDeleteUser,
  adminGetUserQueryKey,
  adminListUsersQueryKey,
  adminUpdateUser,
  useAdminGetUser,
} from "@repo/admin-sdk";
import type {
  CreateUserBody,
  UpdateUserBody,
  UserDetail,
} from "@repo/types/admin";

export const usersQueryPrefix = adminListUsersQueryKey();

export function useUser(id: string) {
  return useAdminGetUser<UserDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data,
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, SdkRequestError, CreateUserBody>({
    mutationFn: async (body) => {
      const res = await adminCreateUser(body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: usersQueryPrefix });
      toast.success("User created");
      navigate(`/settings/team/users/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create user");
    },
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();

  return useMutation<UserDetail, SdkRequestError, UpdateUserBody>({
    mutationFn: async (body) => {
      const res = await adminUpdateUser(id, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryPrefix });
      queryClient.invalidateQueries({ queryKey: adminGetUserQueryKey(id) });
      toast.success("User saved");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save user");
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (id) => {
      await adminDeleteUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryPrefix });
      toast.success("User deleted");
      navigate("/settings/team/users");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete user");
    },
  });
}
