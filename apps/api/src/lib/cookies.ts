import type { Context } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { env } from '../env';

const isProd = env.NODE_ENV === 'production';

export function setSessionCookie(c: Context, token: string, expires: Date) {
  setCookie(c, env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    path: '/',
    expires,
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, env.SESSION_COOKIE_NAME, { path: '/' });
}

export function readSessionCookie(c: Context): string | undefined {
  return getCookie(c, env.SESSION_COOKIE_NAME);
}
