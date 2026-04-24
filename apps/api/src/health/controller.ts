import type { Context } from 'hono';
import { ERROR_CODES } from '@repo/types';
import type { AppEnv } from '../context';
import { pingDatabase } from '../lib/db';
import { err, ok } from '../lib/response';

export async function healthController(c: Context<AppEnv>) {
  const log = c.get('logger');
  try {
    const ping = await pingDatabase();
    return ok(c, {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      version: process.env.npm_package_version ?? 'unknown',
      checks: {
        database: {
          status: 'up',
          durationMs: ping.durationMs,
          pool: {
            total: ping.poolTotal,
            idle: ping.poolIdle,
            waiting: ping.poolWaiting,
          },
        },
      },
    });
  } catch (e) {
    log.error({ err: e }, 'health check failed: database unreachable');
    return err(
      c,
      {
        code: ERROR_CODES.INTERNAL,
        message: 'Database unreachable',
      },
      503
    );
  }
}

/** Liveness probe — intentionally does NOT check dependencies. */
export function liveController(c: Context<AppEnv>) {
  return ok(c, { status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
}
