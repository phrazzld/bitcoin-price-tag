/**
 * Network mocking utilities for browser tests
 * This file provides tools to intercept and mock network requests
 */

import { test as base, expect } from '@playwright/test';

// Re-export expect for the tests that import from this file
export { expect };

/**
 * Extension of the standard test fixture with network mocking capabilities
 */
export const test = base.extend({
  // Before each test, set up network mocking
  page: async ({ page }, use) => {
    // Mock API responses
    await mockNetworkRequests(page);

    // Use the enhanced page object
    await use(page);
  },
});

/**
 * Configure mock responses for any network requests made during tests
 * @param {Page} page - Playwright page object
 */
export async function mockNetworkRequests(page) {
  // Intercept all requests
  await page.route('**/*', async (route, request) => {
    const url = request.url();

    // Handle specific API requests we need to mock
    if (url.includes('api.coindesk.com') || url.includes('bitcoinaverage')) {
      // Mock Bitcoin price API responses
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          // Simplified Coindesk API response format
          time: {
            updated: new Date().toISOString(),
            updatedISO: new Date().toISOString(),
          },
          disclaimer: 'Mock API response for testing',
          bpi: {
            USD: {
              code: 'USD',
              rate: '50,000.00',
              description: 'United States Dollar',
              rateFloat: 50000.0,
            },
            EUR: {
              code: 'EUR',
              rate: '45,000.00',
              description: 'Euro',
              rateFloat: 45000.0,
            },
          },
        }),
      });
      console.debug(`Mocked API response for: ${url}`);
      return;
    }

    // For other requests, either fulfill with an empty response
    // or abort based on the route - aborting can cause ECONNREFUSED
    // errors in some cases, so we prefer fulfilling
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ mocked: true, message: 'Intercepted request' }),
    });
  });

  // Listen for all console errors to help debug ECONNREFUSED issues
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`Browser console error: ${msg.text()}`);
    }
  });

  // Listen for page errors
  page.on('pageerror', (error) => {
    console.error(`Page error: ${error.message}`);
  });

  // Listen for request failures
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    // Only log actual failures, not our intentionally aborted requests
    if (failure && !failure.errorText.includes('aborted')) {
      console.error(`Request failed: ${request.url()}, Error: ${failure.errorText}`);
    }
  });
}
