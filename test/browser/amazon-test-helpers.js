/**
 * Amazon-specific test helpers for browser compatibility tests
 */

import fs from 'fs';
import path from 'path';

// expect is imported for potential future assertion helpers
// eslint-disable-next-line no-unused-vars
import { expect } from '@playwright/test';

/**
 * Load an Amazon fixture HTML file
 * @param {string} fixturePath - Path to the fixture HTML file
 * @returns {string} HTML content
 */
export function loadAmazonFixture(fixturePath) {
  return fs.readFileSync(path.resolve(process.cwd(), fixturePath), 'utf8');
}

/**
 * Enable diagnostic mode for the extension
 * @param {Object} page - Playwright page object
 * @returns {Promise<boolean>} Whether diagnostic mode was enabled
 */
export async function enableDiagnosticMode(page) {
  return await page.evaluate(() => {
    // Try multiple paths to enable diagnostic mode
    if (window.bitcoinPriceTagBridge?.errorHandling?.enableDiagnosticMode) {
      window.bitcoinPriceTagBridge.errorHandling.enableDiagnosticMode();
      return true;
    } else if (window.enableDiagnosticMode) {
      window.enableDiagnosticMode();
      return true;
    } else if (typeof window.configureLogging === 'function') {
      window.configureLogging({
        diagnosticMode: true,
        verbose: true,
        minLevel: 'debug',
      });
      return true;
    }

    console.warn('Bitcoin Price Tag: Could not enable diagnostic mode');
    return false;
  });
}

/**
 * Set up Amazon mock environment in browser
 * @param {Object} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function setupAmazonTestEnvironment(page) {
  await page.addInitScript(() => {
    // Mock Chrome extension API
    window.chrome = {
      runtime: {
        id: 'mock-extension-id',
        sendMessage: (message, callback) => {
          if (message && message.action === 'getBitcoinPrice') {
            setTimeout(() => {
              // Mock Bitcoin price data
              callback({
                btcPrice: 50000,
                satPrice: 0.0005,
                timestamp: Date.now(),
              });
            }, 100);
          }
        },
        onMessage: {
          addListener: () => {},
          removeListener: () => {},
        },
        lastError: null,
        getURL: (path) => 'chrome-extension://mock-extension-id/' + path,
      },
      storage: {
        local: {
          get: (key, callback) => {
            callback({});
          },
          set: (data, callback) => {
            if (callback) callback();
          },
        },
      },
    };

    // Create mock bridge for testing error handling and logging
    window.bitcoinPriceTagBridge = {
      // Core messaging
      sendMessageToBackground: (message, callback) => {
        chrome.runtime.sendMessage(message, callback);
      },
      checkBridgeHealth: () => ({ available: true, lastCheck: Date.now() }),

      // Error handling utilities
      errorHandling: {
        enableDiagnosticMode: () => {
          console.debug('Bitcoin Price Tag: Enabling diagnostic mode');

          // Mock implementation
          window._diagnosticModeEnabled = true;

          // Expose to global scope for test visibility
          window.enableDiagnosticMode = () => {
            window._diagnosticModeEnabled = true;
          };
        },
      },

      // Price data utilities
      priceDataInfo: {
        freshness: 'fresh',
      },

      // Fallback data when needed
      getFallbackPriceData: () => ({
        btcPrice: 50000,
        satPrice: 0.0005,
        timestamp: Date.now(),
        source: 'fallback',
      }),

      // Conversion utilities for callback handlers
      conversionUtils: {
        valueFriendly: (value, _satPrice) => {
          if (value >= 500) {
            return `${(value / 50000).toFixed(5)} BTC`;
          } else {
            return `${Math.round(value / 0.0005).toLocaleString()} sats`;
          }
        },
      },

      // Manifest info
      manifestInfo: {
        version: '2.0.0',
        manifestVersion: 3,
        name: 'Bitcoin Price Tag',
      },
    };
  });
}

/**
 * Capture console logs for analysis
 * @param {Object} page - Playwright page object
 * @returns {Array} - Array to store logs
 */
export async function captureConsoleMessages(page) {
  const logs = [];

  page.on('console', (message) => {
    logs.push({
      type: message.type(),
      text: message.text(),
      location: message.location(),
    });
  });

  return logs;
}

/**
 * Verify Amazon price conversion
 * @param {Object} page - Playwright page object
 * @returns {Promise<Object>} Results of the verification
 */
export async function verifyAmazonPriceConversion(page) {
  return await page.evaluate(() => {
    // Find Amazon price elements
    const originalPrices = document.querySelectorAll('.a-price');
    const convertedElements = document.querySelectorAll('.btc-price-converted-amazon');

    // Check if any conversions happened
    return {
      originalPriceCount: originalPrices.length,
      convertedCount: convertedElements.length,
      success: convertedElements.length > 0,
      hasBtc: document.body.textContent.includes('BTC'),
      hasSats: document.body.textContent.includes('sats'),
      // Check for any error indicators in the body text
      hasErrors:
        document.body.textContent.includes('Error') ||
        document.body.textContent.includes('error') ||
        document.body.textContent.includes('failed') ||
        document.body.textContent.includes('Failed'),
    };
  });
}

/**
 * Check if a page crashed or has critical errors
 * @param {Object} page - Playwright page object
 * @param {Array} logs - Captured console logs
 * @returns {Promise<Object>} Status of the page
 */
export async function checkPageHealthStatus(page, logs) {
  // Check for critical errors in logs
  const criticalErrors = logs.filter(
    (log) =>
      log.type === 'error' &&
      !log.text.includes('restricted iframe') && // Expected error
      !log.text.includes('sandbox'), // Expected error
  );

  // Check page is still responsive
  const isResponsive = await page
    .evaluate(() => ({
      documentAvailable: typeof document !== 'undefined',
      bodyAvailable: document.body !== null,
      title: document.title,
    }))
    .catch(() => false);

  return {
    isAlive: !!isResponsive,
    hasCriticalErrors: criticalErrors.length > 0,
    criticalErrorCount: criticalErrors.length,
    pageDetails: isResponsive,
  };
}
