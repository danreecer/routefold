import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright smoke tests.
 *
 * These check that the public surfaces render and that the authenticated
 * application is actually protected. They deliberately do not sign in: doing so
 * would need live Clerk credentials, and a suite that silently skips when those
 * are absent gives false confidence. What is asserted here holds with no
 * credentials at all.
 *
 * `PLAYWRIGHT_BASE_URL` targets an already-running server; otherwise a
 * production build is started automatically.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3319';

export default defineConfig({
  testDir: './tests/e2e',
  // Not parallel. With Clerk configured every matched route resolves a session
  // before rendering, and parallel WebKit workers contend badly enough on a
  // laptop to produce navigation timeouts in different tests each run. The
  // suite is small; determinism is worth more than the ~30s saved.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Next's dev server treats a host it did not bind as cross-origin for
    // /_next resources, which breaks hydration. Always use the same hostname.
    ignoreHTTPSErrors: true,
  },

  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'pnpm exec next start --port 3319 --hostname localhost',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
