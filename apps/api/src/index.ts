// `./env` MUST be imported first: it loads .env via dotenv side effects before
// any module touches `process.env` (notably @repo/database/client, which
// validates DATABASE_URL at import time).
import { env } from './env';

import { serve, type ServerType } from '@hono/node-server';
import { closeDatabase } from '@repo/database/client';
import { createApp } from './app';
import { pingDatabase } from './lib/db';
import { logger } from './lib/logger';
import { storage } from './lib/storage';

const FORCE_EXIT_MS = 10_000;

async function bootstrap() {
  logger.info(
    {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      logLevel: env.LOG_LEVEL,
      node: process.version,
      pid: process.pid,
    },
    'api starting up'
  );

  // Fail fast if the database is unreachable — crashing on boot is better
  // than starting up and serving 5xxs until the first request hits.
  try {
    const ping = await pingDatabase();
    logger.info(
      {
        durationMs: ping.durationMs,
        pool: { total: ping.poolTotal, idle: ping.poolIdle, waiting: ping.poolWaiting },
      },
      'database connected'
    );
  } catch (e) {
    logger.fatal({ err: e }, 'database connection failed; aborting startup');
    process.exit(1);
  }

  try {
    const ping = await storage.ping();
    logger.info(
      {
        durationMs: ping.durationMs,
        endpoint: env.S3_ENDPOINT,
        bucket: env.S3_BUCKET,
        publicUrl: env.S3_PUBLIC_URL,
      },
      'object storage connected'
    );
  } catch (e) {
    logger.fatal(
      { err: e, endpoint: env.S3_ENDPOINT, bucket: env.S3_BUCKET },
      'object storage connection failed; aborting startup'
    );
    process.exit(1);
  }

  const app = createApp();

  const server: ServerType = serve(
    { fetch: app.fetch, port: env.PORT },
    (info) => {
      logger.info(
        { address: `http://localhost:${info.port}`, port: info.port },
        'server listening'
      );
    }
  );

  installSignalHandlers(server);
  installCrashHandlers();
}

function installSignalHandlers(server: ServerType) {
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutdown signal received');

    const forceExit = setTimeout(() => {
      logger.warn(
        { timeoutMs: FORCE_EXIT_MS },
        'graceful shutdown timed out; forcing exit'
      );
      process.exit(1);
    }, FORCE_EXIT_MS);
    forceExit.unref();

    await new Promise<void>((resolve) => {
      server.close((err) => {
        if (err) logger.error({ err }, 'error closing http server');
        else logger.info('http server closed');
        resolve();
      });
    });

    try {
      await closeDatabase();
      logger.info('database pool closed');
    } catch (e) {
      logger.error({ err: e }, 'error closing database pool');
    }

    logger.info('shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

function installCrashHandlers() {
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaught exception; exiting');
    process.exit(1);
  });
}

bootstrap().catch((e) => {
  logger.fatal({ err: e }, 'bootstrap failed');
  process.exit(1);
});
