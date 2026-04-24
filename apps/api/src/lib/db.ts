import { performance } from 'node:perf_hooks';
import { pool } from '@repo/database/client';

export interface DatabasePingResult {
  durationMs: number;
  poolTotal: number;
  poolIdle: number;
  poolWaiting: number;
}

/**
 * Acquires a connection from the pool and runs `SELECT 1`. Used both at
 * bootstrap (to fail fast if the DB is unreachable) and by the health route.
 */
export async function pingDatabase(): Promise<DatabasePingResult> {
  const start = performance.now();
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
  return {
    durationMs: Number((performance.now() - start).toFixed(1)),
    poolTotal: pool.totalCount,
    poolIdle: pool.idleCount,
    poolWaiting: pool.waitingCount,
  };
}
