import type { Context } from 'hono';
import { loginAdminBody } from '@repo/types/admin';
import { loginBody, registerCustomerBody } from '@repo/types/storefront';
import type { AppEnv } from '../context';
import {
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} from '../lib/cookies';
import { unauthorized } from '../lib/errors';
import { ok } from '../lib/response';
import { parseBody } from '../lib/validate';
import { adminLogin, customerLogin, customerRegister, logout } from './service';

// ── Admin ────────────────────────────────────────────────────────────────────

export async function adminLoginController(c: Context<AppEnv>) {
  const input = await parseBody(c, loginAdminBody);
  const { session, principal } = await adminLogin(input);
  setSessionCookie(c, session.sessionToken, new Date(session.expires));
  c.get('logger').info(
    { userId: principal.userId, event: 'auth.admin.login' },
    'admin logged in'
  );
  return ok(c, { kind: 'admin' as const, ...principal });
}

export async function adminLogoutController(c: Context<AppEnv>) {
  const token = readSessionCookie(c);
  if (token) await logout(token);
  clearSessionCookie(c);
  c.get('logger').info({ event: 'auth.admin.logout' }, 'admin logged out');
  return ok(c, { loggedOut: true });
}

export function adminMeController(c: Context<AppEnv>) {
  return ok(c, c.get('principal'));
}

// ── Customer ─────────────────────────────────────────────────────────────────

export async function customerRegisterController(c: Context<AppEnv>) {
  const input = await parseBody(c, registerCustomerBody);
  const { session, principal } = await customerRegister(input);
  setSessionCookie(c, session.sessionToken, new Date(session.expires));
  c.get('logger').info(
    { customerId: principal.customerId, event: 'auth.customer.register' },
    'customer registered'
  );
  return ok(c, { kind: 'customer' as const, ...principal }, undefined, 201);
}

export async function customerLoginController(c: Context<AppEnv>) {
  const input = await parseBody(c, loginBody);
  const { session, principal } = await customerLogin(input);
  setSessionCookie(c, session.sessionToken, new Date(session.expires));
  c.get('logger').info(
    { customerId: principal.customerId, event: 'auth.customer.login' },
    'customer logged in'
  );
  return ok(c, { kind: 'customer' as const, ...principal });
}

export async function customerLogoutController(c: Context<AppEnv>) {
  const token = readSessionCookie(c);
  if (token) await logout(token);
  clearSessionCookie(c);
  c.get('logger').info({ event: 'auth.customer.logout' }, 'customer logged out');
  return ok(c, { loggedOut: true });
}

export function customerMeController(c: Context<AppEnv>) {
  const p = c.get('principal');
  if (!p) throw unauthorized();
  return ok(c, p);
}
