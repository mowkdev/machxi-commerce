import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: {
    index: 'src/index.ts',
    'storefront/index': 'src/storefront/index.ts',
    'admin/index': 'src/admin/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: !options.watch,
  external: ['@repo/database', 'zod'],
}));
