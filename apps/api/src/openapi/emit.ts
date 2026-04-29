// Emits the OpenAPI document to disk. Used by the SDK codegen pipeline so
// it has a stable file input rather than booting the API server.
//
// Run via:  pnpm --filter @app/api openapi:emit
//
// Output:  apps/api/openapi.json (committed; CI verifies it's up to date)

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateSpecs } from 'hono-openapi';
import { createApp } from '../app';

async function main() {
  const app = createApp();
  const spec = await generateSpecs(app, {
    documentation: {
      info: {
        title: 'machxi-commerce API',
        version: '0.1.0',
        description:
          'Admin + storefront HTTP API. Source of truth for packages/admin-sdk.',
      },
      servers: [{ url: 'http://localhost:8000', description: 'local dev' }],
    },
    excludeMethods: ['HEAD', 'OPTIONS'],
    // Auth.js handler routes are not part of our public contract.
    exclude: [/^\/api\/auth/],
  });

  const out = resolve(process.cwd(), 'openapi.json');
  writeFileSync(out, JSON.stringify(spec, null, 2) + '\n', 'utf8');
  // eslint-disable-next-line no-console
  console.log(`wrote ${out} (${Object.keys(spec.paths).length} paths)`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
