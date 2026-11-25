import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    // Each file starts its own Testcontainers Postgres and exports its URIs
    // through process.env; running files in parallel would have them
    // overwrite each other's connection settings.
    fileParallelism: false,
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
