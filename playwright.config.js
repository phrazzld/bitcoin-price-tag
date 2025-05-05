/**
 * Playwright configuration for browser compatibility testing
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    baseURL: 'chrome-extension://placeholder',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // Chrome-specific configurations
        launchOptions: {
          args: ['--disable-extensions-except=.', '--load-extension=.'],
        },
      },
    },
    {
      name: 'firefox',
      use: {
        browserName: 'firefox',
        // Firefox-specific configurations
      },
    },
    {
      name: 'webkit',
      use: {
        browserName: 'webkit',
        // WebKit-specific configurations
      },
    },
  ],
});
