import type { MiddlewareHandler } from 'hono';
import { getAuthUser } from '@hono/auth-js';
import type { AppEnv } from '../context';
import { forbidden, unauthorized } from '../lib/errors';

export const attachPrincipal: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authUser = await getAuthUser(c);
  const token = authUser?.token;
  if (token && typeof token.userId === 'string') {
    c.set('principal', {
      kind: 'admin',
      userId: token.userId,
      email: typeof token.email === 'string' ? token.email : '',
      roles: Array.isArray(token.roles) ? (token.roles as string[]) : [],
      permissions: Array.isArray(token.permissions)
        ? (token.permissions as string[])
        : [],
    });
  }
  return next();
};

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const p = c.get('principal');
  if (!p) throw unauthorized();
  if (p.kind !== 'admin') throw forbidden('Admin session required');
  return next();
};
