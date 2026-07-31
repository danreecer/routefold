import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Config for the live OpenAI probe.
 *
 * Separate from vitest.config.ts because the main suite deliberately clears
 * OPENAI_API_KEY so no test can make a paid call. This one is opt-in, run by
 * hand, and does make a real (tiny) request.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      'server-only': new URL('./tests/stubs/server-only.ts', import.meta.url).pathname,
    },
  },
  test: {
    include: ['scripts/dev/probe-openai.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
});
