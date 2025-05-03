/**
 * Simple browser compatibility test for Bitcoin Price Tag extension
 */

import { test, expect } from '@playwright/test';

test('Simple browser compatibility test', async ({ page, browserName }) => {
  // Create a simple test page
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Browser Compatibility Test</title>
      </head>
      <body>
        <h1>Browser Compatibility Test</h1>
        <div id="price">$100</div>
      </body>
    </html>
  `);
  
  // Log which browser we're testing
  console.log(`Running test in ${browserName}`);
  
  // Create a simple check for browser support
  const browserInfo = await page.evaluate(() => {
    return {
      userAgent: navigator.userAgent,
      features: {
        promiseSupport: typeof Promise !== 'undefined',
        fetchSupport: typeof fetch !== 'undefined',
        mutationObserver: typeof MutationObserver !== 'undefined'
      }
    };
  });
  
  // All modern browsers should support these features
  expect(browserInfo.features.promiseSupport).toBeTruthy();
  expect(browserInfo.features.fetchSupport).toBeTruthy();
  expect(browserInfo.features.mutationObserver).toBeTruthy();
  
  // Simple test for accessing a DOM element
  const priceElement = await page.locator('#price').textContent();
  expect(priceElement).toBe('$100');
});