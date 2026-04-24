import { Hono } from 'hono';
import { loginAdminBody } from '@repo/types/admin';
import { loginBody, registerCustomerBody } from '@repo/types/storefront';
import type { AppEnv } from '../context';
import { clearSessionCookie, readSessionCookie, setSessionCookie } from '../lib/cookies';
import { unauthorized } from '../lib/errors';
import { ok } from '../lib/response';
import { parseBody } from '../lib/validate';
import { requireAdmin, requireCustomer } from './middleware';
import { adminLogin, customerLogin, customerRegister, logout } from './service';

export const authRoutes = new Hono<AppEnv>();

// ── Admin ────────────────────────────────────────────────────────────────────

authRoutes.post('/admin/login', async (c) => {
  const input = await parseBody(c, loginAdminBody);
  const { session, principal } = await adminLogin(input);
  setSessionCookie(c, session.sessionToken, new Date(session.expires));
  return ok(c, { kind: 'admin' as const, ...principal });
});

authRoutes.post('/admin/logout', async (c) => {
  const token = readSessionCookie(c);
  if (token) await logout(token);
  clearSessionCookie(c);
  return ok(c, { loggedOut: true });
});

authRoutes.get('/admin/me', requireAdmin, (c) => {
  return ok(c, c.get('principal'));
});

// ── Customer ─────────────────────────────────────────────────────────────────

authRoutes.post('/customers/register', async (c) => {
  const input = await parseBody(c, registerCustomerBody);
  const { session, principal } = await customerRegister(input);
  setSessionCookie(c, session.sessionToken, new Date(session.expires));
  return ok(c, { kind: 'customer' as const, ...principal }, undefined, 201);
});

authRoutes.post('/customers/login', async (c) => {
  const input = await parseBody(c, loginBody);
  const { session, principal } = await customerLogin(input);
  setSessionCookie(c, session.sessionToken, new Date(session.expires));
  return ok(c, { kind: 'customer' as const, ...principal });
});

authRoutes.post('/customers/logout', async (c) => {
  const token = readSessionCookie(c);
  if (token) await logout(token);
  clearSessionCookie(c);
  return ok(c, { loggedOut: true });
});

authRoutes.get('/customers/me', requireCustomer, (c) => {
  const p = c.get('principal');
  if (!p) throw unauthorized();
  return ok(c, p);
});
