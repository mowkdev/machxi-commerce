import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: { index: 'src/index.ts' },
  format: ['cjs', 'esm'],
  // Skip DTS in watch mode — apps consume the .d.ts files produced by the
  // one-shot `^build` (which `dev` depends on); regenerating them on every
  // source edit is the slowest step and unnecessary in dev.
  dts: !options.watch,
  splitting: false,
  sourcemap: true,
  clean: !options.watch,
}));
