import type { MiddlewareHandler } from 'hono';
import { getAuthUser } from '@hono/auth-js';
import type { AppEnv } from '../context';
import { forbidden, unauthorized } from '../lib/errors';
import { verifyCustomerToken } from './customer-jwt';

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match ? match[1].trim() : null;
}

export const attachPrincipal: MiddlewareHandler<AppEnv> = async (c, next) => {
  // Storefront Bearer JWT takes precedence: it's an explicit credential the
  // caller chose to attach, and admin Auth.js cookies may be present in the
  // same browser session without the caller intending to use them.
  const bearer = extractBearerToken(c.req.header('Authorization'));
  if (bearer) {
    const claims = await verifyCustomerToken(bearer);
    if (claims) {
      c.set('principal', {
        kind: 'customer',
        customerId: claims.customerId,
        email: claims.email,
      });
      return next();
    }
  }

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

export const requireCustomer: MiddlewareHandler<AppEnv> = async (c, next) => {
  const p = c.get('principal');
  if (!p) throw unauthorized();
  if (p.kind !== 'customer') throw forbidden('Customer session required');
  return next();
};
