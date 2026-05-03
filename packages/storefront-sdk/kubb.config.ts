import { defineConfig } from '@kubb/core';
import { pluginOas } from '@kubb/plugin-oas';
import { pluginTs } from '@kubb/plugin-ts';
import { pluginZod } from '@kubb/plugin-zod';
import { pluginClient } from '@kubb/plugin-client';
import { pluginReactQuery } from '@kubb/plugin-react-query';

// Storefront SDK is restricted to operations under `/api/store/*`. As more
// public-facing endpoints land (cart, checkout, public catalog) they pick up
// this filter automatically by virtue of their path prefix.
const storefrontPathFilter = { type: 'path' as const, pattern: /^\/api\/store\// };

export default defineConfig({
  root: '.',
  input: { path: '../../apps/api/openapi.json' },
  output: { path: './src/gen', clean: true },
  plugins: [
    pluginOas({ validate: true, collisionDetection: true }),
    pluginTs({
      output: { path: './types' },
      enumType: 'asConst',
      include: [storefrontPathFilter],
    }),
    pluginZod({
      output: { path: './zod' },
      typed: true,
      include: [storefrontPathFilter],
    }),
    pluginClient({
      output: { path: './client' },
      importPath: '../../runtime',
      dataReturnType: 'data',
      parser: 'zod',
      include: [storefrontPathFilter],
    }),
    pluginReactQuery({
      output: { path: './hooks' },
      client: { importPath: '../../runtime' },
      query: { methods: ['get'] },
      mutation: { methods: ['post', 'put', 'patch', 'delete'] },
      include: [storefrontPathFilter],
    }),
  ],
});
