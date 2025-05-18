import { test, expect } from '../fixtures/extension';

test.describe('Basic Extension Loading', () => {
  test('should load extension and service worker', async ({ context, extensionId, serviceWorker }) => {
    // Verify extension loaded
    expect(extensionId).toBeTruthy();
    expect(extensionId).toMatch(/^[a-z]{32}$/);
    
    // Verify service worker is available
    expect(serviceWorker).toBeTruthy();
    expect(serviceWorker.url()).toContain('service-worker');
    
    // Navigate to test page
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/index.html`);
    
    // Verify we can access chrome APIs
    const hasRuntimeAPI = await page.evaluate(() => {
      return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
    });
    expect(hasRuntimeAPI).toBe(true);
    
    await page.close();
  });
});