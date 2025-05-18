import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests/playwright/specs',
  fullyParallel: false, // Run tests sequentially for better isolation
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid conflicts
  reporter: 'html',
  
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  webServer: {
    command: 'pnpm build',
    cwd: path.join(__dirname),
    reuseExistingServer: !process.env.CI,
  },
});