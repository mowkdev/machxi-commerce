import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiRequestError } from '@/lib/api';
import type {
  CategoryDetail,
  CategoryListItem,
  CreateCategoryBody,
  UpdateCategoryBody,
} from '@repo/types/admin';
import {
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  listAllCategories,
  categoriesKeys,
} from './api';

export function useCategory(id: string) {
  return useQuery<CategoryDetail, ApiRequestError>({
    queryKey: categoriesKeys.detail(id),
    queryFn: () => getCategory(id),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, ApiRequestError, CreateCategoryBody>({
    mutationFn: createCategory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: categoriesKeys.list() });
      queryClient.invalidateQueries({ queryKey: categoriesKeys.options() });
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

  return useMutation<CategoryDetail, ApiRequestError, UpdateCategoryBody>({
    mutationFn: (body) => updateCategory(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(categoriesKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: categoriesKeys.list() });
      queryClient.invalidateQueries({ queryKey: categoriesKeys.options() });
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

  return useMutation<void, ApiRequestError, string>({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesKeys.list() });
      queryClient.invalidateQueries({ queryKey: categoriesKeys.options() });
      toast.success('Category deleted');
      navigate('/categories');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });
}

export function useCategoryOptions() {
  return useQuery<CategoryListItem[], ApiRequestError>({
    queryKey: categoriesKeys.options(),
    queryFn: listAllCategories,
    staleTime: 5 * 60 * 1000,
  });
}
