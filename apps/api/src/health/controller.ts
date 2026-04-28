import type { Context } from 'hono';
import { ERROR_CODES } from '@repo/types';
import type { AppEnv } from '../context';
import { pingDatabase } from '../lib/db';
import { storage } from '../lib/storage';
import { err, ok } from '../lib/response';

type CheckResult = { status: 'up' | 'down'; durationMs?: number; message?: string };

export async function healthController(c: Context<AppEnv>) {
  const log = c.get('logger');

  const [dbResult, storageResult] = await Promise.allSettled([
    pingDatabase(),
    storage.ping(),
  ]);

  const database: CheckResult & {
    pool?: { total: number; idle: number; waiting: number };
  } =
    dbResult.status === 'fulfilled'
      ? {
          status: 'up',
          durationMs: dbResult.value.durationMs,
          pool: {
            total: dbResult.value.poolTotal,
            idle: dbResult.value.poolIdle,
            waiting: dbResult.value.poolWaiting,
          },
        }
      : { status: 'down', message: errorMessage(dbResult.reason) };

  const storageCheck: CheckResult =
    storageResult.status === 'fulfilled'
      ? { status: 'up', durationMs: storageResult.value.durationMs }
      : { status: 'down', message: errorMessage(storageResult.reason) };

  const allUp = database.status === 'up' && storageCheck.status === 'up';

  if (!allUp) {
    log.error(
      { database, storage: storageCheck },
      'health check failed: one or more dependencies unreachable'
    );
    return err(
      c,
      { code: ERROR_CODES.INTERNAL, message: 'One or more dependencies unreachable' },
      503
    );
  }

  return ok(c, {
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    version: process.env.npm_package_version ?? 'unknown',
    checks: { database, storage: storageCheck },
  });
}

/** Liveness probe — intentionally does NOT check dependencies. */
export function liveController(c: Context<AppEnv>) {
  return ok(c, { status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
