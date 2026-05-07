import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: {
    index: 'src/index.ts',
    client: 'src/client.ts',
    'schema/index': 'src/schema/index.ts',
    validators: 'src/validators.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  // Don't wipe `dist/` in watch mode — apps consume these files at runtime via
  // tsx, and a brief empty window causes ERR_MODULE_NOT_FOUND on dev startup.
  clean: !options.watch,
  external: ['pg', 'drizzle-orm', 'drizzle-zod', 'zod'],
}));
