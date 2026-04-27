import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    environment: 'node',
    setupFiles: ['src/__tests__/load-env.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
