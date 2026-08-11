import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3210);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Only the *.spec.ts files are tests; seed.ts and the global hooks live
  // alongside them.
  testMatch: /.*\.spec\.ts/,

  // The suite shares one seeded account and one database, so parallel workers
  // would race each other through the same rows.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL,
    // Signed in by default; the auth spec opts out for the anonymous cases.
    storageState: 'e2e/.auth/owner.json',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Pixel 7'] } }],

  webServer: {
    // Against the production build in CI, as the Next.js guide recommends —
    // dev-only behaviour is exactly what would slip through otherwise.
    command: process.env.CI
      ? `npm run build && npx next start --port ${PORT}`
      : `npx next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
