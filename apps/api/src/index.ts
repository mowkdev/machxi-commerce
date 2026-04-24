import { serve } from '@hono/node-server';
import { closeDatabase } from '@repo/database/client';
import { createApp } from './app';
import { env } from './env';

const app = createApp();

const server = serve(
  { fetch: app.fetch, port: env.PORT },
  (info) => {
    console.log(`[api] listening on http://localhost:${info.port} (${env.NODE_ENV})`);
  }
);

async function shutdown(signal: string) {
  console.log(`[api] received ${signal}, shutting down`);
  server.close();
  await closeDatabase();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
