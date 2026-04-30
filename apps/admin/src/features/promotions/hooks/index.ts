import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  SdkRequestError,
  adminCreatePromotion,
  adminCreatePromotionAmount,
  adminCreatePromotionTarget,
  adminCreatePromotionTranslation,
  adminDeletePromotion,
  adminDeletePromotionAmount,
  adminDeletePromotionTarget,
  adminDeletePromotionTranslation,
  adminGetPromotionQueryKey,
  adminListPromotionAmountsQueryKey,
  adminListPromotionTargetsQueryKey,
  adminListPromotionTranslationsQueryKey,
  adminListPromotionsQueryKey,
  adminUpdatePromotion,
  adminUpdatePromotionAmount,
  adminUpdatePromotionTarget,
  adminUpdatePromotionTranslation,
  useAdminGetPromotion,
  useAdminListCategories,
  useAdminListProducts,
} from '@repo/admin-sdk';
import type {
  CategoryListItem,
  CreatePromotionAmountBody,
  CreatePromotionBody,
  CreatePromotionTargetBody,
  CreatePromotionTranslationBody,
  PromotionAmount,
  PromotionDetail,
  PromotionTarget,
  PromotionTranslation,
  UpdatePromotionAmountBody,
  UpdatePromotionBody,
  UpdatePromotionTargetBody,
  UpdatePromotionTranslationBody,
} from '@repo/types/admin';

type ProductTargetOption = {
  id: string;
  baseSku: string | null;
  name: string | null;
  status: string;
};

export const promotionsQueryPrefix = adminListPromotionsQueryKey();

function useInvalidatePromotion(promotionId: string) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: promotionsQueryPrefix });
    queryClient.invalidateQueries({ queryKey: adminGetPromotionQueryKey(promotionId) });
    queryClient.invalidateQueries({
      queryKey: adminListPromotionAmountsQueryKey(promotionId),
    });
    queryClient.invalidateQueries({
      queryKey: adminListPromotionTargetsQueryKey(promotionId),
    });
    queryClient.invalidateQueries({
      queryKey: adminListPromotionTranslationsQueryKey(promotionId),
    });
  };
}

export function usePromotion(id: string) {
  return useAdminGetPromotion<PromotionDetail>(id, {
    query: {
      enabled: !!id,
      select: (response) => response.data,
    },
  });
}

export function usePromotionProductTargets(search?: string) {
  return useAdminListProducts<ProductTargetOption[]>(
    {
      pageSize: 200,
      search: search?.trim() || undefined,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    },
    {
      query: {
        staleTime: 5 * 60 * 1000,
        select: (response) => response.data,
      },
    }
  );
}

export function usePromotionCategoryTargets(search?: string) {
  return useAdminListCategories<CategoryListItem[]>(
    {
      pageSize: 200,
      search: search?.trim() || undefined,
      sortBy: 'rank',
      sortOrder: 'asc',
    },
    {
      query: {
        staleTime: 5 * 60 * 1000,
        select: (response) => response.data,
      },
    }
  );
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<{ id: string }, SdkRequestError, CreatePromotionBody>({
    mutationFn: async (body) => {
      const res = await adminCreatePromotion(body);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryPrefix });
      toast.success('Promotion created');
      navigate(`/promotions/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create promotion');
    },
  });
}

export function useUpdatePromotion(id: string) {
  const invalidatePromotion = useInvalidatePromotion(id);

  return useMutation<PromotionDetail, SdkRequestError, UpdatePromotionBody>({
    mutationFn: async (body) => {
      const res = await adminUpdatePromotion(id, body);
      return res.data;
    },
    onSuccess: () => {
      invalidatePromotion();
      toast.success('Promotion saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save promotion');
    },
  });
}

export function useCreatePromotionAmount(promotionId: string) {
  const invalidatePromotion = useInvalidatePromotion(promotionId);

  return useMutation<PromotionAmount, SdkRequestError, CreatePromotionAmountBody>({
    mutationFn: async (body) => {
      const res = await adminCreatePromotionAmount(promotionId, body);
      return res.data;
    },
    onSuccess: () => {
      invalidatePromotion();
      toast.success('Promotion amount added');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add promotion amount');
    },
  });
}

export function useUpdatePromotionAmount(promotionId: string) {
  const invalidatePromotion = useInvalidatePromotion(promotionId);

  return useMutation<
    PromotionAmount,
    SdkRequestError,
    { amountId: string; body: UpdatePromotionAmountBody }
  >({
    mutationFn: async ({ amountId, body }) => {
      const res = await adminUpdatePromotionAmount(promotionId, amountId, body);
      return res.data;
    },
    onSuccess: () => {
      invalidatePromotion();
      toast.success('Promotion amount saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save promotion amount');
    },
  });
}

export function useDeletePromotionAmount(promotionId: string) {
  const invalidatePromotion = useInvalidatePromotion(promotionId);

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (amountId) => {
      await adminDeletePromotionAmount(promotionId, amountId);
    },
    onSuccess: () => {
      invalidatePromotion();
      toast.success('Promotion amount deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete promotion amount');
    },
  });
}

export function useCreatePromotionTarget(promotionId: string) {
  const invalidatePromotion = useInvalidatePromotion(promotionId);

  return useMutation<PromotionTarget, SdkRequestError, CreatePromotionTargetBody>({
    mutationFn: async (body) => {
      const res = await adminCreatePromotionTarget(promotionId, body);
      return res.data;
    },
    onSuccess: () => {
      invalidatePromotion();
      toast.success('Promotion target added');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add promotion target');
    },
  });
}

export function useUpdatePromotionTarget(promotionId: string) {
  const invalidatePromotion = useInvalidatePromotion(promotionId);

  return useMutation<
    PromotionTarget,
    SdkRequestError,
    { targetId: string; body: UpdatePromotionTargetBody }
  >({
    mutationFn: async ({ targetId, body }) => {
      const res = await adminUpdatePromotionTarget(promotionId, targetId, body);
      return res.data;
    },
    onSuccess: () => {
      invalidatePromotion();
      toast.success('Promotion target saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save promotion target');
    },
  });
}

export function useDeletePromotionTarget(promotionId: string) {
  const invalidatePromotion = useInvalidatePromotion(promotionId);

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (targetId) => {
      await adminDeletePromotionTarget(promotionId, targetId);
    },
    onSuccess: () => {
      invalidatePromotion();
      toast.success('Promotion target deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete promotion target');
    },
  });
}

export function useCreatePromotionTranslation(promotionId: string) {
  const invalidatePromotion = useInvalidatePromotion(promotionId);

  return useMutation<PromotionTranslation, SdkRequestError, CreatePromotionTranslationBody>({
    mutationFn: async (body) => {
      const res = await adminCreatePromotionTranslation(promotionId, body);
      return res.data;
    },
    onSuccess: () => {
      invalidatePromotion();
      toast.success('Promotion translation added');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add promotion translation');
    },
  });
}

export function useUpdatePromotionTranslation(promotionId: string) {
  const invalidatePromotion = useInvalidatePromotion(promotionId);

  return useMutation<
    PromotionTranslation,
    SdkRequestError,
    { translationId: string; body: UpdatePromotionTranslationBody }
  >({
    mutationFn: async ({ translationId, body }) => {
      const res = await adminUpdatePromotionTranslation(promotionId, translationId, body);
      return res.data;
    },
    onSuccess: () => {
      invalidatePromotion();
      toast.success('Promotion translation saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save promotion translation');
    },
  });
}

export function useDeletePromotionTranslation(promotionId: string) {
  const invalidatePromotion = useInvalidatePromotion(promotionId);

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (translationId) => {
      await adminDeletePromotionTranslation(promotionId, translationId);
    },
    onSuccess: () => {
      invalidatePromotion();
      toast.success('Promotion translation deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete promotion translation');
    },
  });
}

export function useDeletePromotion() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, SdkRequestError, string>({
    mutationFn: async (id) => {
      await adminDeletePromotion(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryPrefix });
      toast.success('Promotion deleted');
      navigate('/promotions');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete promotion');
    },
  });
}
