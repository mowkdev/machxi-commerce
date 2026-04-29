// Mounts the OpenAPI document at `/openapi.json`.
//
// Dev-only: production builds should set OPENAPI_DOCS_ENABLED=false (the
// default) so we don't expose the spec publicly. Static generation for SDK
// codegen runs through a separate script (`pnpm openapi:emit`).

import { Hono } from 'hono';
import { openAPIRouteHandler } from 'hono-openapi';
import type { AppEnv } from '../context';

export function mountOpenAPI(parent: Hono<AppEnv>): void {
  parent.get(
    '/openapi.json',
    openAPIRouteHandler(parent, {
      documentation: {
        info: {
          title: 'machxi-commerce API',
          version: '0.1.0',
          description:
            'Admin + storefront HTTP API. The SDK in packages/admin-sdk is generated from this document.',
        },
        servers: [{ url: 'http://localhost:3001', description: 'local dev' }],
        tags: [
          { name: 'products', description: 'Admin product catalog' },
          { name: 'categories', description: 'Admin categories' },
          { name: 'media', description: 'Admin media library' },
          { name: 'tax-classes', description: 'Admin tax classes' },
        ],
      },
    })
  );
}
