import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ApiRequestError } from '@/lib/api';
import { adminLogin, adminLogout, fetchAdminMe, type AdminPrincipal } from './api';

export const authKeys = {
  me: ['auth', 'admin', 'me'] as const,
};

export function useAdminMe() {
  return useQuery<AdminPrincipal, ApiRequestError>({
    queryKey: authKeys.me,
    queryFn: fetchAdminMe,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminLogin,
    onSuccess: (principal) => {
      queryClient.setQueryData(authKeys.me, principal);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: adminLogout,
    onSettled: () => {
      queryClient.removeQueries({ queryKey: authKeys.me });
      navigate('/login', { replace: true });
    },
  });
}
