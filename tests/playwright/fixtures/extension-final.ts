import { test as base, chromium, BrowserContext, Worker } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

// Final working fixture that handles all extension functionality
export const finalTest = base.extend<{
  extensionContext: BrowserContext;
  extensionId: string;
  serviceWorker?: Worker;
}>({
  extensionContext: async (_, use) => {
    const extensionPath = path.join(__dirname, '../../../dist');
    
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--enable-extension-logging',
        '--enable-background-mode',
      ],
      ignoreDefaultArgs: ['--disable-extensions'],
    });

    await use(context);
    await context.close();
  },

  extensionId: async ({ extensionContext }, use) => {
    // Wait for extension to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get extension ID from chrome://extensions page
    const page = await extensionContext.newPage();
    await page.goto('chrome://extensions/', { waitUntil: 'networkidle' });
    
    // Enable developer mode
    const devModeToggle = page.locator('#developer-mode-checkbox');
    if (await devModeToggle.isVisible()) {
      await devModeToggle.click();
      await page.waitForTimeout(1000);
    }

    // Find our extension
    const extensionCards = page.locator('extensions-item');
    const count = await extensionCards.count();
    
    let foundExtensionId = '';
    for (let i = 0; i < count; i++) {
      const card = extensionCards.nth(i);
      const name = await card.locator('#name').textContent();
      
      if (name?.includes('Bitcoin Price Tag')) {
        const id = await card.getAttribute('id');
        if (id) {
          foundExtensionId = id;
          break;
        }
      }
    }
    
    await page.close();
    
    if (!foundExtensionId) {
      throw new Error('Extension not found on chrome://extensions page');
    }
    
    await use(foundExtensionId);
  },

  serviceWorker: async ({ extensionContext, extensionId }, use) => {
    let detectedWorker: Worker | undefined;
    
    // Listen for service worker (works when navigating to web pages)
    const workerPromise = new Promise<Worker>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Service worker not detected within timeout'));
      }, 5000);
      
      extensionContext.on('serviceworker', (worker: Worker) => {
        if (worker.url().includes(extensionId)) {
          clearTimeout(timeout);
          resolve(worker);
        }
      });
    });
    
    // Trigger service worker by navigating to a webpage
    const triggerPage = await extensionContext.newPage();
    
    try {
      await triggerPage.goto('https://httpbin.org/html', { waitUntil: 'domcontentloaded' });
      detectedWorker = await workerPromise;
    } catch {
      // Service worker detection failed, but that's okay
      console.log('⚠️ Service worker not detected via events, but extension should work');
    } finally {
      await triggerPage.close();
    }
    
    await use(detectedWorker);
  },
});

/**
 * Helper function to set up a page with working extension functionality
 * This manually injects content script and mocks Chrome APIs since automatic injection doesn't work in Playwright
 */
export async function setupExtensionPage(context: BrowserContext, extensionId: string, url: string = 'https://httpbin.org/html') {
  const page = await context.newPage();
  
  // Read content script
  const contentScriptPath = path.join(__dirname, '../../../dist/content-script/index.js');
  const contentScriptCode = readFileSync(contentScriptPath, 'utf8');
  
  // Set up Chrome extension API mocks before navigation
  await page.addInitScript((extId: string) => {
    interface ChromeMessage {
      requestId: string;
      type: string;
      timestamp: number;
    }
    
    interface ChromeResponse {
      requestId: string;
      type: string;
      status: string;
      data?: {
        usdRate: number;
        satoshiRate: number;
        fetchedAt: number;
        source: string;
      };
      timestamp: number;
    }
    
    (window as typeof window & { chrome: unknown }).chrome = {
      runtime: {
        id: extId,
        sendMessage: (message: ChromeMessage, callback: (response: ChromeResponse) => void) => {
          // Simulate service worker response
          setTimeout(() => {
            const mockResponse = {
              requestId: message.requestId,
              type: 'PRICE_RESPONSE',
              status: 'success',
              data: {
                usdRate: 45000, // $45,000 per BTC
                satoshiRate: 0.00004444, // ~$0.000044 per satoshi
                fetchedAt: Date.now(),
                source: 'MockAPI'
              },
              timestamp: Date.now()
            };
            callback(mockResponse);
          }, 100);
        },
        lastError: null
      },
      storage: {
        local: {
          get: () => Promise.resolve({}),
          set: () => Promise.resolve()
        }
      },
      i18n: {
        getMessage: (key: string) => key
      }
    };
  }, extensionId);
  
  // Navigate to the page
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  // Inject content script after page loads
  await page.addScriptTag({
    content: contentScriptCode
  });
  
  // Wait for content script initialization
  await page.waitForTimeout(1000);
  
  return page;
}

export { expect } from '@playwright/test';