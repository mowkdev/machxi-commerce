import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: { index: 'src/index.ts' },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: !options.watch,
  external: ['react', 'react-dom', '@repo/types', '@repo/utils'],
}));
