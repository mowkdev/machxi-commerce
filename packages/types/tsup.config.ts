import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: {
    index: 'src/index.ts',
    'storefront/index': 'src/storefront/index.ts',
    'admin/index': 'src/admin/index.ts',
  },
  format: ['cjs', 'esm'],
  // Skip DTS in watch — `.d.ts` from one-shot `^build` stays put (clean:false in
  // watch), so apps still see types. Avoids redundant DTS regen on every edit.
  dts: !options.watch,
  splitting: false,
  sourcemap: true,
  clean: !options.watch,
  external: ['@repo/database', 'zod'],
}));
