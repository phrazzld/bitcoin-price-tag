/**
 * Simple browser compatibility test for Bitcoin Price Tag extension
 */

import { test, expect } from './network-mock.js';

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
  console.debug(`Running test in ${browserName}`);

  // Create a simple check for browser support
  const browserInfo = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    features: {
      promiseSupport: typeof Promise !== 'undefined',
      fetchSupport: typeof fetch !== 'undefined',
      mutationObserver: typeof MutationObserver !== 'undefined',
    },
  }));

  // All modern browsers should support these features
  expect(browserInfo.features.promiseSupport).toBeTruthy();
  expect(browserInfo.features.fetchSupport).toBeTruthy();
  expect(browserInfo.features.mutationObserver).toBeTruthy();

  // Simple test for accessing a DOM element
  const priceElement = await page.locator('#price').textContent();
  expect(priceElement).toBe('$100');

  // Test network request handling - this should be intercepted and mocked
  await test.step('Test network mocking', async () => {
    // Add our mocked fetch functionality to the page
    await page.evaluate(() => {
      // Create a simple function to fetch the Bitcoin price API
      window.testFetch = async () => {
        try {
          // This request should be intercepted by our network-mock.js
          const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json');
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
          }
          const data = await response.json();
          return { success: true, data };
        } catch (error) {
          // If our mocking is working properly, this should not happen
          // for the Coindesk URL. Other URLs will be aborted.
          return { success: false, error: error.message };
        }
      };
    });

    // Try to execute the fetch (this should use our mock)
    const result = await page.evaluate(() => window.testFetch());

    // Should have a successful response with mocked data
    expect(result.success).toBeTruthy();
    expect(result.data.bpi).toBeDefined();
    expect(result.data.bpi.USD.rateFloat).toBe(50000.0);
  });
});
