import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { ERROR_CODES } from '@repo/types';
import type { AppEnv } from './context';
import { env } from './env';
import { attachPrincipal } from './auth/middleware';
import { authRoutes } from './auth/routes';
import { healthRoutes } from './health/routes';
import { logger } from './lib/logger';
import { requestLogger } from './lib/requestLogger';
import { err, errFromException } from './lib/response';

export function createApp() {
  const app = new Hono<AppEnv>();

  // Order matters: requestLogger must run first so every other middleware
  // (including errors) has access to the per-request child logger.
  app.use('*', requestLogger);
  app.use('*', secureHeaders());
  app.use(
    '*',
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use('*', attachPrincipal);

  app.onError((e, c) => {
    const log = c.get('logger') ?? logger;
    log.error({ err: e }, 'unhandled error in request');
    return errFromException(c, e);
  });

  app.notFound((c) =>
    err(c, { code: ERROR_CODES.NOT_FOUND, message: 'Route not found' }, 404)
  );

  app.route('/health', healthRoutes);
  app.route('/auth', authRoutes);

  return app;
}
