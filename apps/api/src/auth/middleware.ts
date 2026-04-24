import type { MiddlewareHandler } from 'hono';
import { db } from '@repo/database/client';
import { customers, users } from '@repo/database/schema';
import { eq } from '@repo/database';
import type { AppEnv } from '../context';
import { readSessionCookie, clearSessionCookie } from '../lib/cookies';
import { forbidden, unauthorized } from '../lib/errors';
import { findActiveSession } from './sessions';
import { loadUserAccess } from './rbac';

export const attachPrincipal: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = readSessionCookie(c);
  if (!token) return next();

  const session = await findActiveSession(token);
  if (!session) {
    clearSessionCookie(c);
    return next();
  }

  if (session.userId) {
    const [user] = await db
      .select({ id: users.id, email: users.email, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    if (!user || !user.isActive) {
      clearSessionCookie(c);
      return next();
    }
    const access = await loadUserAccess(user.id);
    c.set('principal', {
      kind: 'admin',
      userId: user.id,
      email: user.email,
      roles: access.roles,
      permissions: access.permissions,
    });
  } else if (session.customerId) {
    const [customer] = await db
      .select({ id: customers.id, email: customers.email })
      .from(customers)
      .where(eq(customers.id, session.customerId))
      .limit(1);
    if (!customer) {
      clearSessionCookie(c);
      return next();
    }
    c.set('principal', {
      kind: 'customer',
      customerId: customer.id,
      email: customer.email,
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
