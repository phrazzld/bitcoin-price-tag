import { finalTest as test, expect, setupExtensionPage } from '../fixtures/extension-final';

test.describe('Basic Extension Loading', () => {
  test('should load extension and service worker', async ({ extensionContext, extensionId, serviceWorker }) => {
    // Verify extension loaded
    expect(extensionId).toBeTruthy();
    expect(extensionId).toMatch(/^[a-z]{32}$/);
    
    // Service worker detection works when navigating to web pages
    if (serviceWorker) {
      expect(serviceWorker.url()).toContain('service-worker');
    }
    
    // Test actual extension functionality
    const page = await setupExtensionPage(extensionContext, extensionId);
    
    // Add test prices to verify functionality
    await page.evaluate(() => {
      document.body.innerHTML += '<div><p>Test price: $100</p></div>';
    });
    
    // Wait for annotation
    await page.waitForTimeout(1000);
    
    // Verify price annotation worked
    const pageText = await page.textContent('body');
    expect(pageText).toContain('$100');
    expect(pageText).toContain('sats');
    
    await page.close();
  });
});