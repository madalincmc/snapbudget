import { defineConfig, devices } from '@playwright/test';

/**
 * Overridable because 3000 is not reliably ours: this machine runs several
 * unrelated Next projects, and `reuseExistingServer` cannot tell one dev
 * server from another — it reused a different app's, and every test failed on
 * a login route that app does not have. `PORT=3001 npm run test:e2e` when
 * something else already holds the default.
 */
const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // `fullyParallel: false` only serialises within a file — separate files
  // still get separate workers. Every spec signs in as the one fixture
  // account, and generating a magic link invalidates the address's previous
  // one, so two files starting at once leave whichever redeems second with a
  // 401. They share the account's receipts too, which the cleanup wipes
  // wholesale. One worker is what "one fixture account" actually costs.
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Reused rather than always spawned: the local-testing skill's dev server
  // is frequently already up, and Turbopack's HMR means it already reflects
  // the current source without a restart.
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
