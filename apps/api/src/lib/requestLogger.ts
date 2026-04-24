import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../context';
import { logger } from './logger';

const REQUEST_ID_HEADER = 'x-request-id';

// Routes we deliberately log at `debug` so they don't flood the info stream
// once load-balancer / k8s probes start hammering them.
const QUIET_PATHS = new Set<string>(['/health']);

export const requestLogger: MiddlewareHandler<AppEnv> = async (c, next) => {
  const requestId = c.req.header(REQUEST_ID_HEADER) ?? randomUUID();
  const method = c.req.method;
  const path = c.req.path;

  const child = logger.child({ requestId, method, path });
  c.set('logger', child);
  c.set('requestId', requestId);
  c.header(REQUEST_ID_HEADER, requestId);

  const start = performance.now();
  child.debug('request received');

  try {
    await next();
  } finally {
    const durationMs = Number((performance.now() - start).toFixed(1));
    const status = c.res.status;
    const principal = c.get('principal');
    const actor =
      principal?.kind === 'admin'
        ? { actorKind: 'admin' as const, userId: principal.userId }
        : principal?.kind === 'customer'
          ? { actorKind: 'customer' as const, customerId: principal.customerId }
          : {};

    const level =
      status >= 500
        ? 'error'
        : status >= 400
          ? 'warn'
          : QUIET_PATHS.has(path)
            ? 'debug'
            : 'info';

    child[level]({ status, durationMs, ...actor }, 'request completed');
  }
};
