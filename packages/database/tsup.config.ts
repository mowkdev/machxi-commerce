import { defineConfig } from 'tsup';

export default defineConfig({
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
  clean: true,
  external: ['pg', 'drizzle-orm', 'drizzle-zod', 'zod'],
});
