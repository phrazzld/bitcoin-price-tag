/**
 * Helper functions for browser compatibility tests
 */

import { expect } from '@playwright/test';

/**
 * Loads a test page with the extension
 * @param {Object} page - Playwright page object
 * @param {string} content - HTML content to display on the page
 * @returns {Promise<void>}
 */
export async function loadTestPage(page, content) {
  await page.setContent(content);
  // Wait for the extension content script to run
  // This is an approximation, as content scripts can load at different speeds
  await page.waitForTimeout(500);
}

/**
 * Create a basic HTML page with currency elements
 * @param {Array<string>} currencyTexts - Array of text containing currency values
 * @returns {string} - HTML content
 */
export function createCurrencyPage(currencyTexts) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bitcoin Price Tag Test Page</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
          }
          .price-item {
            margin-bottom: 10px;
            padding: 5px;
            border: 1px solid #eee;
          }
        </style>
      </head>
      <body>
        <h1>Currency Test Page</h1>
        <div id="price-container">
          ${currencyTexts
            .map(
              (text) => `
            <div class="price-item" data-testid="price-element">
              ${text}
            </div>
          `,
            )
            .join('')}
        </div>
      </body>
    </html>
  `;
}

/**
 * Wait for currency conversion to complete
 * @param {Object} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function waitForCurrencyConversion(page) {
  // Wait for any Bitcoin or satoshi annotations to appear
  try {
    await page.waitForFunction(
      () => document.body.textContent.includes('BTC') || document.body.textContent.includes('sats'),
      { timeout: 5000 },
    );
  } catch (error) {
    // If timeout occurs, the conversion might have failed
    console.error('Currency conversion may have failed:', error);
  }
}

/**
 * Verify that currency conversion has occurred
 * @param {Object} page - Playwright page object
 * @returns {Promise<boolean>} - True if conversion occurred
 */
export async function verifyCurrencyConversion(page) {
  // Check if the page contains Bitcoin or satoshi annotations
  const hasBtc = await page.evaluate(() => document.body.textContent.includes('BTC'));

  const hasSats = await page.evaluate(() => document.body.textContent.includes('sats'));

  return hasBtc || hasSats;
}

/**
 * Get the browser name from the current test environment
 * @param {Object} browserName - Browser instance
 * @returns {string} - Browser name: 'chromium', 'firefox', or 'webkit'
 */
export function getBrowserName(browserName) {
  return browserName || 'unknown';
}
