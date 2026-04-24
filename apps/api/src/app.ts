import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './auth/routes';
import { attachPrincipal } from './auth/middleware';
import type { AppEnv } from './context';
import { env } from './env';
import { ok, errFromException } from './lib/response';

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use('*', logger());
  app.use(
    '*',
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use('*', attachPrincipal);

  app.onError((e, c) => errFromException(c, e));

  app.get('/health', (c) => ok(c, { status: 'ok', uptime: process.uptime() }));

  app.route('/auth', authRoutes);

  return app;
}
