import { test as base, chromium, BrowserContext, Worker } from '@playwright/test';
import path from 'path';

// Custom fixture to handle extension loading
export const test = base.extend<{
  extensionId: string;
  context: BrowserContext;
  serviceWorker: any;
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const extensionPath = path.join(__dirname, '../../../dist');
    
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // Get the service worker which should contain the extension ID in its URL
    const serviceWorker = await context.waitForEvent('serviceworker', {
      predicate: worker => worker.url().includes('chrome-extension'),
      timeout: 10000,
    });
    
    // Extract extension ID from service worker URL
    // Format: chrome-extension://[extension-id]/service-worker/index.js
    const url = serviceWorker.url();
    const match = url.match(/chrome-extension:\/\/([^/]+)\//);
    const extensionId = match ? match[1] : '';
    
    await use(extensionId);
  },

  serviceWorker: async ({ context }: { context: BrowserContext }, use: (worker: Worker) => Promise<void>) => {
    // Wait for service worker to be available
    const worker = await context.waitForEvent('serviceworker', {
      predicate: (worker: Worker) => worker.url().includes('service-worker'),
      timeout: 10000,
    });
    
    await use(worker);
  },
});

export { expect } from '@playwright/test';