import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * Some sandboxes ship a browser that does not match the version Playwright
 * would download. Point this at that binary to use it instead; unset, the
 * normal `npx playwright install` browsers are used.
 */
const executablePath = process.env.STACKMAP_CHROMIUM_PATH;

/**
 * End-to-end tests run against the real app in a browser.
 *
 * They cover the things unit and component tests structurally cannot: moving
 * through the whole wizard, going back to a step and finding your data still
 * there, and a map surviving a page reload.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],

  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
