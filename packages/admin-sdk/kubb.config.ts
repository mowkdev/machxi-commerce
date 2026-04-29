import { defineConfig } from '@kubb/core';
import { pluginOas } from '@kubb/plugin-oas';
import { pluginTs } from '@kubb/plugin-ts';
import { pluginZod } from '@kubb/plugin-zod';
import { pluginClient } from '@kubb/plugin-client';
import { pluginReactQuery } from '@kubb/plugin-react-query';

export default defineConfig({
  root: '.',
  input: { path: '../../apps/api/openapi.json' },
  output: { path: './src/gen', clean: true },
  plugins: [
    pluginOas({ validate: true, collisionDetection: true }),
    pluginTs({
      output: { path: './types' },
      enumType: 'asConst',
    }),
    pluginZod({
      output: { path: './zod' },
      typed: true,
    }),
    pluginClient({
      output: { path: './client' },
      importPath: '../../runtime',
      dataReturnType: 'data',
      parser: 'zod',
    }),
    pluginReactQuery({
      output: { path: './hooks' },
      client: { importPath: '../../runtime' },
      query: { methods: ['get'] },
      mutation: { methods: ['post', 'put', 'patch', 'delete'] },
    }),
  ],
});
