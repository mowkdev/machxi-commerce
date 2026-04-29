import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  SdkRequestError,
  adminCreateCategory,
  adminDeleteCategory,
  adminListCategoriesQueryKey,
  adminUpdateCategory,
  useAdminGetCategory,
  useAdminListCategories,
} from '@repo/admin-sdk';
import type {
  CategoryDetail,
  CategoryListItem,
  CreateCategoryBody,
  UpdateCategoryBody,
} from '@repo/types/admin';

// Query hooks compose generated SDK hooks directly. Mutation hooks wrap raw SDK
// clients so app concerns stay local: toast, navigation, and cache invalidation.
export const categoriesQueryPrefix = adminListCategoriesQueryKey();

export function useCategory(id: string) {
  return useAdminGetCategory<CategoryDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data,
    },
  });
}

export function useCategoryOptions() {
  return useAdminListCategories<CategoryListItem[]>(
    { pageSize: 200, sortBy: 'name', sortOrder: 'asc' },
    {
      query: {
        staleTime: 5 * 60 * 1000,
        select: (response) => response.data,
      },
    }
  );
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, SdkRequestError, CreateCategoryBody>({
    mutationFn: async (body) => {
      const res = await adminCreateCategory(body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryPrefix });
      toast.success('Category created');
      navigate(`/categories/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create category');
    },
  });
}

export function useUpdateCategory(id: string) {
  const queryClient = useQueryClient();

  return useMutation<CategoryDetail, SdkRequestError, UpdateCategoryBody>({
    mutationFn: async (body) => {
      const res = await adminUpdateCategory(id, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryPrefix });
      toast.success('Category saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save category');
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (id) => {
      await adminDeleteCategory(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryPrefix });
      toast.success('Category deleted');
      navigate('/categories');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });
}
