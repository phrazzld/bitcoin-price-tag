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
  globalSetup: './test/browser/global-setup.js',

  // No webServer needed since we're using mocks
  // webServer: {
  //   command: 'echo "No server needed, using mocks"',
  //   url: 'http://localhost:9222', // Dummy URL that won't be used
  //   reuseExistingServer: true,
  //   ignoreHTTPSErrors: true,
  // },

  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    baseURL: 'chrome-extension://placeholder',
    screenshot: 'only-on-failure',

    // Block all network requests that aren't intercepted
    ignoreHTTPSErrors: true,

    // Setup request interception for all tests
    routing: {
      timeout: 5000, // Reduce timeout for faster test failures
    },

    // Additional context options including base directory for script loading
    contextOptions: {
      baseURL: 'file://' + new URL('.', import.meta.url).pathname,
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // Chrome-specific configurations
        launchOptions: {
          args: [
            '--disable-extensions-except=.',
            '--load-extension=.',
            // Disable network access completely for security
            '--disable-network-access',
            // Use a dummy proxy to prevent real network requests
            '--proxy-server=127.0.0.1:1',
          ],
        },
      },
    },
    {
      name: 'firefox',
      use: {
        browserName: 'firefox',
        // Firefox-specific configurations
        launchOptions: {
          firefoxUserPrefs: {
            // Prevent network requests in Firefox tests
            'network.proxy.type': 1,
            'network.proxy.http': '127.0.0.1',
            'network.proxy.http_port': 1,
            'network.proxy.ssl': '127.0.0.1',
            'network.proxy.ssl_port': 1,
          },
        },
      },
    },
    {
      name: 'webkit',
      use: {
        browserName: 'webkit',
        // WebKit-specific configurations
        contextOptions: {
          // Prevent network connections in WebKit
          proxy: {
            server: '127.0.0.1:1',
          },
        },
      },
    },
  ],
});
