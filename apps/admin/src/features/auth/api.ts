import axios from 'axios';
import type { LoginAdminBody } from '@repo/types/admin';
import type { AdminSession } from '@repo/types';
import { ApiRequestError } from '@/lib/api';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const authClient = axios.create({
  baseURL: `${baseURL}/api/auth`,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    // Tell Auth.js to return the redirect URL as JSON instead of issuing
    // a 302 redirect — required for fetch/XHR-driven login flows.
    'X-Auth-Return-Redirect': '1',
  },
});

type AdminPrincipal = AdminSession & { kind: 'admin' };

interface AuthJsSession {
  user?: { id?: string; email?: string | null; name?: string | null };
  roles?: string[];
  permissions?: string[];
  expires?: string;
}

async function getCsrfToken(): Promise<string> {
  const res = await authClient.get<{ csrfToken: string }>('/csrf');
  return res.data.csrfToken;
}

export async function adminLogin(input: LoginAdminBody): Promise<AdminPrincipal> {
  const csrfToken = await getCsrfToken();
  const body = new URLSearchParams({
    csrfToken,
    email: input.email,
    password: input.password,
    callbackUrl: '/',
  });
  const res = await authClient.post<{ url?: string }>(
    '/callback/credentials',
    body,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      validateStatus: () => true,
    }
  );

  const url = typeof res.data?.url === 'string' ? res.data.url : '';
  if (res.status >= 400 || url.includes('/api/auth/error') || url.includes('error=')) {
    throw new ApiRequestError(
      { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
      401
    );
  }

  return fetchAdminMe();
}

export async function adminLogout(): Promise<void> {
  const csrfToken = await getCsrfToken();
  const body = new URLSearchParams({
    csrfToken,
    callbackUrl: '/',
  });
  await authClient.post('/signout', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}

export async function fetchAdminMe(): Promise<AdminPrincipal> {
  const res = await authClient.get<AuthJsSession>('/session');
  const session = res.data;
  if (!session?.user?.id || !session.user.email) {
    throw new ApiRequestError(
      { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      401
    );
  }
  return {
    kind: 'admin',
    userId: session.user.id,
    email: session.user.email,
    roles: Array.isArray(session.roles) ? session.roles : [],
    permissions: Array.isArray(session.permissions) ? session.permissions : [],
  };
}

export type { AdminPrincipal };
