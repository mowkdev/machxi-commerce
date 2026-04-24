import type { LoginAdminBody } from '@repo/types/admin';
import type { AdminSession } from '@repo/types';
import { api } from '@/lib/api';

type AdminPrincipal = AdminSession & { kind: 'admin' };

export async function adminLogin(input: LoginAdminBody): Promise<AdminPrincipal> {
  const res = await api.post<AdminPrincipal>('/auth/admin/login', input);
  return res.data;
}

export async function adminLogout(): Promise<void> {
  await api.post('/auth/admin/logout');
}

export async function fetchAdminMe(): Promise<AdminPrincipal> {
  const res = await api.get<AdminPrincipal>('/auth/admin/me');
  return res.data;
}

export type { AdminPrincipal };
