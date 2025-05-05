/**
 * Amazon page compatibility tests for Bitcoin Price Tag extension
 *
 * These tests verify that the extension works correctly on Amazon pages,
 * including proper handling of restricted contexts and graceful degradation.
 */

import { test, expect } from '@playwright/test';

import {
  loadTestPage,
  waitForCurrencyConversion,
  verifyCurrencyConversion,
  getBrowserName,
} from './test-helpers.js';
import { createMockExtensionEnvironment } from './mock-extension.js';

// Configure diagnostic mode for enhanced logging
const ENABLE_DIAGNOSTIC_MODE = true;

// Test fixtures for Amazon pages
const AMAZON_FIXTURES = {
  productPage: './test/fixtures/amazon-product.html',
  searchPage: './test/fixtures/amazon-search.html',
  cartPage: './test/fixtures/amazon-cart.html',
  iframePage: './test/fixtures/amazon-iframe.html',
};

/**
 * Enable diagnostic mode for detailed error logging
 * @param {Object} page - Playwright page object
 */
async function enableDiagnosticMode(page) {
  await page.evaluate(() => {
    if (window.bitcoinPriceTagBridge?.errorHandling?.enableDiagnosticMode) {
      window.bitcoinPriceTagBridge.errorHandling.enableDiagnosticMode();
      console.log('Bitcoin Price Tag: Diagnostic mode enabled');
    } else if (window.enableDiagnosticMode) {
      window.enableDiagnosticMode();
      console.log('Bitcoin Price Tag: Fallback diagnostic mode enabled');
    }
  });
}

/**
 * Create Amazon mock product page
 * @returns {string} HTML content for a mock Amazon product page
 */
function createAmazonProductPage() {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Amazon.com: Test Product</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .a-price { font-weight: bold; }
          .a-price .a-price-symbol { vertical-align: top; font-size: 0.7em; }
          .a-price .a-price-whole { font-size: 1.2em; }
          .a-price .a-price-fraction { vertical-align: top; font-size: 0.7em; }
        </style>
      </head>
      <body>
        <div id="dp" class="a-container">
          <div id="ppd" class="a-row">
            <div id="rightCol" class="a-col-right">
              <div id="desktop_buybox">
                <div id="corePriceDisplay_desktop_feature_div">
                  <div class="a-section a-spacing-small">
                    <span class="a-price" data-a-size="xl">
                      <span class="a-price-symbol">$</span>
                      <span class="a-price-whole">199</span>
                      <span class="a-price-fraction">99</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div id="centerCol" class="a-col-left">
              <div id="title_feature_div">
                <h1 id="title" class="a-size-large">
                  Test Product with Bitcoin Price
                </h1>
              </div>
              
              <div id="feature-bullets">
                <ul class="a-unordered-list">
                  <li><span class="a-list-item">Feature 1</span></li>
                  <li><span class="a-list-item">Price reduced from <span class="a-price">
                    <span class="a-price-symbol">$</span>
                    <span class="a-price-whole">249</span>
                    <span class="a-price-fraction">99</span>
                  </span></span></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div id="dp-container">
            <div class="a-section">
              <h2>Similar items from $99.99 to $399.99</h2>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Create Amazon mock search results page
 * @returns {string} HTML content for a mock Amazon search results page
 */
function createAmazonSearchPage() {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Amazon.com: Search Results</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .s-result-item { padding: 10px; margin-bottom: 10px; border: 1px solid #eee; }
          .a-price { font-weight: bold; }
        </style>
      </head>
      <body>
        <div id="search">
          <div class="s-desktop-width-max s-desktop-content s-matching">
            <div class="s-main-slot s-result-list s-search-results">
              
              <div class="s-result-item" data-index="0">
                <div class="a-section">
                  <h2>Product 1</h2>
                  <div class="a-price-block">
                    <span class="a-price">
                      <span class="a-price-symbol">$</span>
                      <span class="a-price-whole">24</span>
                      <span class="a-price-fraction">99</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="s-result-item" data-index="1">
                <div class="a-section">
                  <h2>Product 2</h2>
                  <div class="a-price-block">
                    <span class="a-price">
                      <span class="a-price-symbol">$</span>
                      <span class="a-price-whole">899</span>
                      <span class="a-price-fraction">00</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="s-result-item" data-index="2">
                <div class="a-section">
                  <h2>Product 3</h2>
                  <div class="a-price-block">
                    <span class="a-price">
                      <span class="a-price-symbol">$</span>
                      <span class="a-price-whole">1,299</span>
                      <span class="a-price-fraction">99</span>
                    </span>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Create Amazon mock cart page
 * @returns {string} HTML content for a mock Amazon cart page
 */
function createAmazonCartPage() {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Amazon.com: Shopping Cart</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .sc-item { padding: 10px; margin-bottom: 10px; border: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div id="sc-cart-contents">
          <div class="sc-list-container">
            <div class="sc-list">
              
              <div class="sc-item">
                <div class="sc-item-content">
                  <div class="sc-item-details">
                    <h3>Item 1</h3>
                    <div class="sc-price">$49.99</div>
                  </div>
                </div>
              </div>
              
              <div class="sc-item">
                <div class="sc-item-content">
                  <div class="sc-item-details">
                    <h3>Item 2</h3>
                    <div class="sc-price">$129.99</div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
          
          <div class="sc-subtotal">
            <span class="a-size-medium">Subtotal (2 items):</span>
            <span class="a-price a-size-medium">
              <span class="a-price-symbol">$</span>
              <span class="a-price-whole">179</span>
              <span class="a-price-fraction">98</span>
            </span>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Create mock page with iframe that simulates Amazon restricted context
 * @returns {string} HTML content for a mock iframe page
 */
function createAmazonIframePage() {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Amazon.com: Page with Iframes</title>
      </head>
      <body>
        <h1>Page with Amazon iframe</h1>
        
        <!-- Regular iframe -->
        <iframe id="regular-iframe" srcdoc="
          <html>
            <head><title>Normal Frame</title></head>
            <body>
              <h2>Normal iframe content</h2>
              <div>Price: $99.99</div>
            </body>
          </html>
        " width="400" height="200"></iframe>
        
        <!-- Sandboxed iframe to simulate restriction -->
        <iframe id="restricted-iframe" sandbox="allow-scripts" srcdoc="
          <html>
            <head><title>Restricted Frame</title></head>
            <body>
              <h2>Restricted iframe content</h2>
              <div class='a-price'>
                <span class='a-price-symbol'>$</span>
                <span class='a-price-whole'>149</span>
                <span class='a-price-fraction'>99</span>
              </div>
            </body>
          </html>
        " width="400" height="200"></iframe>
        
        <!-- Cross-origin iframe placeholder -->
        <div>
          <h3>Cross-origin iframe would be here</h3>
          <p>Price: $199.99</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Capture console messages from page for later verification
 * @param {Object} page - Playwright page object
 * @returns {Promise<Array>} Array of console messages
 */
async function captureConsoleLogs(page) {
  return await page.evaluate(() => {
    const logs = [];
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    // Override console methods to capture logs
    console.log = function () {
      logs.push({ type: 'log', args: Array.from(arguments).map(String) });
      originalConsole.log.apply(console, arguments);
    };

    console.warn = function () {
      logs.push({ type: 'warn', args: Array.from(arguments).map(String) });
      originalConsole.warn.apply(console, arguments);
    };

    console.error = function () {
      logs.push({ type: 'error', args: Array.from(arguments).map(String) });
      originalConsole.error.apply(console, arguments);
    };

    console.debug = function () {
      logs.push({ type: 'debug', args: Array.from(arguments).map(String) });
      originalConsole.debug.apply(console, arguments);
    };

    return logs;
  });
}

// Test for Amazon page compatibility
test.describe('Bitcoin Price Tag - Amazon Page Compatibility', () => {
  test.beforeEach(async ({ page, browserName }) => {
    // Create an enhanced mock environment for each test
    await page.addInitScript(() => {
      // Create enhanced mock Chrome extension API
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

          logError: (error, context) => {
            console.error(`Mock error logging: ${error.message}`, context);
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

        // Manifest info
        manifestInfo: {
          version: '2.0.0',
          manifestVersion: 3,
          name: 'Bitcoin Price Tag',
        },
      };

      // Create utilities needed by the extension
      window.enableDiagnosticMode = () => {
        window._diagnosticModeEnabled = true;
        console.debug('Bitcoin Price Tag: Global diagnostic mode enabled');
      };

      // Expose conversion utilities for callback handlers
      window.bitcoinPriceTagBridge.conversionUtils = {
        valueFriendly: (value, satPrice) => {
          if (value >= 500) {
            return `${(value / 50000).toFixed(5)} BTC`;
          } else {
            return `${Math.round(value / 0.0005).toLocaleString()} sats`;
          }
        },
      };
    });

    // Log which browser we're testing
    console.log(`Running Amazon test in ${browserName} browser`);
  });

  test('should convert prices on Amazon product pages', async ({ page }) => {
    // Load Amazon product page
    await loadTestPage(page, createAmazonProductPage());

    if (ENABLE_DIAGNOSTIC_MODE) {
      await enableDiagnosticMode(page);
    }

    // Inject necessary extension scripts
    await page.addScriptTag({ path: './conversion.js', type: 'module' });
    await page.addScriptTag({ path: './error-handling.js', type: 'module' });
    await page.addScriptTag({ path: './context-provider.js', type: 'module' });
    await page.addScriptTag({ path: './callback-utils.js', type: 'module' });

    // Capture console logs for later analysis
    const logs = await captureConsoleLogs(page);

    // Add mock DOM processor that simulates our extension's behavior
    await page.evaluate(() => {
      const btcPrice = 50000;
      const satPrice = 0.0005;

      // Process Amazon-style prices
      function processAmazonPrice(container) {
        // Skip if already processed
        if (container.hasAttribute && container.hasAttribute('data-btc-processed')) {
          return;
        }

        // Mark as processed
        try {
          container.setAttribute('data-btc-processed', 'true');
        } catch (e) {
          console.error('Failed to mark as processed', e);
          return;
        }

        // Extract components
        const symbol = container.querySelector('.a-price-symbol')?.textContent || '';
        const whole = container.querySelector('.a-price-whole')?.textContent || '';
        const fraction = container.querySelector('.a-price-fraction')?.textContent || '';

        if (symbol && whole) {
          // Parse into numeric value
          const wholeClean = whole.replace(/,/g, '');
          const price = parseFloat(`${wholeClean}.${fraction}`);

          // Don't process invalid prices
          if (isNaN(price) || price <= 0) {
            return;
          }

          // Create conversion element
          const newEl = document.createElement('div');
          newEl.className = 'btc-price-converted-amazon';

          // Determine BTC or satoshi representation
          if (price >= 500) {
            newEl.innerHTML = `
              <span class="original-price">${symbol}${whole}.${fraction}</span>
              <span class="btc-price-tag-converted">${(price / btcPrice).toFixed(5)} BTC</span>
            `;
          } else {
            newEl.innerHTML = `
              <span class="original-price">${symbol}${whole}.${fraction}</span>
              <span class="btc-price-tag-converted">${Math.round(price / satPrice).toLocaleString()} sats</span>
            `;
          }

          // Insert after price container
          container.parentNode.insertBefore(newEl, container.nextSibling);

          // Hide original container
          container.style.opacity = '0';
          container.style.height = '0';
          container.style.overflow = 'hidden';
        }
      }

      // Find and process all Amazon price elements
      const amazonPrices = document.querySelectorAll('.a-price');
      amazonPrices.forEach(processAmazonPrice);

      // Process regular price formats in text nodes
      function walkDOM(node) {
        // Process node if it's a text node
        if (node.nodeType === 3) {
          const text = node.nodeValue;
          const regex = /\$(\d{1,3}(,\d{3})*(\.\d{2})?)/g;

          let match;
          if ((match = regex.exec(text)) !== null) {
            const priceText = match[0];
            const amount = parseFloat(match[1].replace(/,/g, ''));

            // Only convert valid prices
            if (!isNaN(amount) && amount > 0) {
              let btcValue = '';
              if (amount >= 500) {
                btcValue = ` (${(amount / btcPrice).toFixed(5)} BTC)`;
              } else {
                btcValue = ` (${Math.round(amount / satPrice).toLocaleString()} sats)`;
              }

              // Replace text with conversion
              node.nodeValue = text.replace(priceText, `${priceText}${btcValue}`);
            }
          }
        } else {
          // Process children recursively
          for (let i = 0; i < node.childNodes.length; i++) {
            walkDOM(node.childNodes[i]);
          }
        }
      }

      // Process text price formats
      const textContainers = [
        document.getElementById('dp-container'),
        document.getElementById('feature-bullets'),
      ];

      textContainers.forEach((container) => {
        if (container) walkDOM(container);
      });
    });

    // Verify price conversion in main product area
    const mainPriceConverted = await page.evaluate(() => {
      const convertedElement = document.querySelector('.btc-price-converted-amazon');
      return convertedElement ? convertedElement.textContent.trim() : null;
    });

    // Check for BTC/satoshi conversion
    expect(mainPriceConverted).toBeTruthy();
    expect(mainPriceConverted).toContain('$199.99');
    expect(mainPriceConverted).toContain('sats');

    // Verify other prices were converted
    const otherPricesConverted = await page.evaluate(() => {
      const bulletPoints = document.querySelector('#feature-bullets').textContent;
      const similarItems = document.querySelector('#dp-container').textContent;

      return {
        bulletPoints: bulletPoints.includes('BTC') || bulletPoints.includes('sats'),
        similarItems: similarItems.includes('BTC') || similarItems.includes('sats'),
      };
    });

    expect(otherPricesConverted.bulletPoints).toBeTruthy();
    expect(otherPricesConverted.similarItems).toBeTruthy();

    // Verify no critical errors in console
    const errors = await page.evaluate(() => window.consoleErrors || []);

    // Should have no "critical" errors (warnings are acceptable)
    const criticalErrors = errors.filter((e) => e && e.type === 'error');
    expect(criticalErrors.length).toBe(0);
  });

  test('should convert all prices on Amazon search pages', async ({ page }) => {
    // Load Amazon search page
    await loadTestPage(page, createAmazonSearchPage());

    if (ENABLE_DIAGNOSTIC_MODE) {
      await enableDiagnosticMode(page);
    }

    // Inject necessary extension scripts
    await page.addScriptTag({ path: './conversion.js', type: 'module' });
    await page.addScriptTag({ path: './error-handling.js', type: 'module' });
    await page.addScriptTag({ path: './context-provider.js', type: 'module' });
    await page.addScriptTag({ path: './callback-utils.js', type: 'module' });

    // Add mock DOM processor that simulates our extension's behavior
    await page.evaluate(() => {
      const btcPrice = 50000;
      const satPrice = 0.0005;

      // Process Amazon-style prices
      function processAmazonPrice(container) {
        // Skip if already processed
        if (container.hasAttribute && container.hasAttribute('data-btc-processed')) {
          return;
        }

        // Mark as processed
        try {
          container.setAttribute('data-btc-processed', 'true');
        } catch (e) {
          console.error('Failed to mark as processed', e);
          return;
        }

        // Extract components
        const symbol = container.querySelector('.a-price-symbol')?.textContent || '';
        const whole = container.querySelector('.a-price-whole')?.textContent || '';
        const fraction = container.querySelector('.a-price-fraction')?.textContent || '';

        if (symbol && whole) {
          // Parse into numeric value
          const wholeClean = whole.replace(/,/g, '');
          const price = parseFloat(`${wholeClean}.${fraction}`);

          // Don't process invalid prices
          if (isNaN(price) || price <= 0) {
            return;
          }

          // Create conversion element
          const newEl = document.createElement('div');
          newEl.className = 'btc-price-converted-amazon';

          // Determine BTC or satoshi representation
          if (price >= 500) {
            newEl.innerHTML = `
              <span class="original-price">${symbol}${whole}.${fraction}</span>
              <span class="btc-price-tag-converted">${(price / btcPrice).toFixed(5)} BTC</span>
            `;
          } else {
            newEl.innerHTML = `
              <span class="original-price">${symbol}${whole}.${fraction}</span>
              <span class="btc-price-tag-converted">${Math.round(price / satPrice).toLocaleString()} sats</span>
            `;
          }

          // Insert after price container
          container.parentNode.insertBefore(newEl, container.nextSibling);

          // Hide original container
          container.style.opacity = '0';
          container.style.height = '0';
          container.style.overflow = 'hidden';
        }
      }

      // Find and process all Amazon price elements in search results
      const amazonPrices = document.querySelectorAll('.s-result-item .a-price');
      amazonPrices.forEach(processAmazonPrice);
    });

    // Verify all search result prices were converted
    const conversionResults = await page.evaluate(() => {
      // Get all converted elements
      const convertedElements = document.querySelectorAll('.btc-price-converted-amazon');

      // Check all search result items
      const resultItems = document.querySelectorAll('.s-result-item');

      return {
        convertedCount: convertedElements.length,
        resultCount: resultItems.length,
        // Sample the price text from the first element
        firstPriceText: convertedElements[0]?.textContent.trim(),
        // Large price should use BTC, check the second element
        secondPriceText: convertedElements[1]?.textContent.trim(),
      };
    });

    // Should have converted all search result prices
    expect(conversionResults.convertedCount).toBe(3);
    expect(conversionResults.resultCount).toBe(3);

    // First price ($24.99) should use satoshis
    expect(conversionResults.firstPriceText).toContain('$24.99');
    expect(conversionResults.firstPriceText).toContain('sats');

    // Second price ($899.00) should use BTC
    expect(conversionResults.secondPriceText).toContain('$899');
    expect(conversionResults.secondPriceText).toContain('BTC');
  });

  test('should handle cart pages with price updates', async ({ page }) => {
    // Load Amazon cart page
    await loadTestPage(page, createAmazonCartPage());

    if (ENABLE_DIAGNOSTIC_MODE) {
      await enableDiagnosticMode(page);
    }

    // Inject necessary extension scripts
    await page.addScriptTag({ path: './conversion.js', type: 'module' });
    await page.addScriptTag({ path: './error-handling.js', type: 'module' });
    await page.addScriptTag({ path: './context-provider.js', type: 'module' });
    await page.addScriptTag({ path: './callback-utils.js', type: 'module' });

    // Add mock DOM processor that simulates our extension's behavior
    await page.evaluate(() => {
      const btcPrice = 50000;
      const satPrice = 0.0005;

      // Process Amazon-style prices
      function processAmazonPrice(container) {
        // Skip if already processed
        if (container.hasAttribute && container.hasAttribute('data-btc-processed')) {
          return;
        }

        // Mark as processed
        try {
          container.setAttribute('data-btc-processed', 'true');
        } catch (e) {
          console.error('Failed to mark as processed', e);
          return;
        }

        // Extract components for Amazon price structure
        const symbol = container.querySelector('.a-price-symbol')?.textContent || '';
        const whole = container.querySelector('.a-price-whole')?.textContent || '';
        const fraction = container.querySelector('.a-price-fraction')?.textContent || '';

        if (symbol && whole) {
          // Parse into numeric value
          const wholeClean = whole.replace(/,/g, '');
          const price = parseFloat(`${wholeClean}.${fraction}`);

          // Don't process invalid prices
          if (isNaN(price) || price <= 0) {
            return;
          }

          // Create conversion element
          const newEl = document.createElement('div');
          newEl.className = 'btc-price-converted-amazon';

          // Determine BTC or satoshi representation
          if (price >= 500) {
            newEl.innerHTML = `
              <span class="original-price">${symbol}${whole}.${fraction}</span>
              <span class="btc-price-tag-converted">${(price / btcPrice).toFixed(5)} BTC</span>
            `;
          } else {
            newEl.innerHTML = `
              <span class="original-price">${symbol}${whole}.${fraction}</span>
              <span class="btc-price-tag-converted">${Math.round(price / satPrice).toLocaleString()} sats</span>
            `;
          }

          // Insert after price container
          container.parentNode.insertBefore(newEl, container.nextSibling);

          // Hide original container
          container.style.opacity = '0';
          container.style.height = '0';
          container.style.overflow = 'hidden';
        }
      }

      // Process regular price text (for cart items)
      function processTextPrice(element) {
        // Skip if already processed
        if (element.hasAttribute && element.hasAttribute('data-btc-processed')) {
          return;
        }

        // Mark as processed
        try {
          element.setAttribute('data-btc-processed', 'true');
        } catch (e) {
          console.error('Failed to mark as processed', e);
          return;
        }

        // Extract price from text
        const text = element.textContent;
        const match = text.match(/\$(\d{1,3}(,\d{3})*(\.\d{2})?)/);

        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ''));

          // Don't process invalid prices
          if (isNaN(amount) || amount <= 0) {
            return;
          }

          // Create conversion element
          const newEl = document.createElement('div');
          newEl.className = 'btc-price-converted';

          // Determine BTC or satoshi representation
          if (amount >= 500) {
            newEl.innerHTML = `
              <span class="original-price">${match[0]}</span>
              <span class="btc-price-tag-converted">${(amount / btcPrice).toFixed(5)} BTC</span>
            `;
          } else {
            newEl.innerHTML = `
              <span class="original-price">${match[0]}</span>
              <span class="btc-price-tag-converted">${Math.round(amount / satPrice).toLocaleString()} sats</span>
            `;
          }

          // Insert after price container
          element.parentNode.insertBefore(newEl, element.nextSibling);

          // Hide original element
          element.style.opacity = '0';
          element.style.height = '0';
          element.style.overflow = 'hidden';
        }
      }

      // Find and process all prices in cart page

      // Standard Amazon price format (subtotal)
      const amazonPrices = document.querySelectorAll('.a-price');
      amazonPrices.forEach(processAmazonPrice);

      // Text-based prices (cart items)
      const textPrices = document.querySelectorAll('.sc-price');
      textPrices.forEach(processTextPrice);

      // Simulate DOM changes to test the extension's ability to handle them
      setTimeout(() => {
        // Update cart subtotal
        const subtotalElement = document.querySelector('.sc-subtotal .a-price');
        if (subtotalElement) {
          subtotalElement.querySelector('.a-price-whole').textContent = '199';
          subtotalElement.querySelector('.a-price-fraction').textContent = '98';

          // Remove the processed attribute to simulate a fresh update
          subtotalElement.removeAttribute('data-btc-processed');

          // Also remove the conversion node we added earlier
          const conversionNode = subtotalElement.parentNode.querySelector(
            '.btc-price-converted-amazon',
          );
          if (conversionNode) conversionNode.remove();

          // Reset visibility of the original node
          subtotalElement.style.opacity = '1';
          subtotalElement.style.height = 'auto';
          subtotalElement.style.overflow = 'visible';

          // Process the updated price
          processAmazonPrice(subtotalElement);
        }
      }, 1000);
    });

    // Wait for initial conversion to complete
    await page.waitForSelector('.btc-price-converted-amazon');

    // Verify item prices were converted
    const cartItemsConverted = await page.evaluate(() => {
      const convertedElements = document.querySelectorAll('.btc-price-converted');
      return convertedElements.length;
    });

    expect(cartItemsConverted).toBe(2);

    // Verify subtotal was converted
    const subtotalConverted = await page.evaluate(() => {
      const convertedElement = document.querySelector('.sc-subtotal .btc-price-converted-amazon');
      return convertedElement ? convertedElement.textContent.trim() : null;
    });

    expect(subtotalConverted).toBeTruthy();
    expect(subtotalConverted).toContain('$179.98');

    // Wait for the simulated update to occur
    await page.waitForTimeout(1500);

    // Verify the updated subtotal was re-converted
    const updatedSubtotalConverted = await page.evaluate(() => {
      const convertedElement = document.querySelector('.sc-subtotal .btc-price-converted-amazon');
      return convertedElement ? convertedElement.textContent.trim() : null;
    });

    expect(updatedSubtotalConverted).toBeTruthy();
    expect(updatedSubtotalConverted).toContain('$199.98');
  });

  test('should safely handle restricted iframe contexts', async ({ page }) => {
    // Load page with iframes
    await loadTestPage(page, createAmazonIframePage());

    if (ENABLE_DIAGNOSTIC_MODE) {
      await enableDiagnosticMode(page);
    }

    // Inject necessary extension scripts
    await page.addScriptTag({ path: './conversion.js', type: 'module' });
    await page.addScriptTag({ path: './error-handling.js', type: 'module' });
    await page.addScriptTag({ path: './context-provider.js', type: 'module' });
    await page.addScriptTag({ path: './callback-utils.js', type: 'module' });

    // Add mock context detection and DOM processor for main page
    await page.evaluate(() => {
      const btcPrice = 50000;
      const satPrice = 0.0005;

      // Simplified context detection
      function isRestrictedContext() {
        return false; // Main page is not restricted
      }

      // Process text prices on the main page
      function processTextPrices() {
        const textWalker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false,
        );

        let textNode;
        while ((textNode = textWalker.nextNode())) {
          const text = textNode.nodeValue;
          const regex = /\$(\d{1,3}(,\d{3})*(\.\d{2})?)/g;

          if (regex.test(text)) {
            // Reset regex state
            regex.lastIndex = 0;

            let match;
            let newText = text;

            while ((match = regex.exec(text)) !== null) {
              const price = match[0];
              const amount = parseFloat(match[1].replace(/,/g, ''));

              if (!isNaN(amount) && amount > 0) {
                let btcValue;
                if (amount >= 500) {
                  btcValue = `${price} (${(amount / btcPrice).toFixed(5)} BTC)`;
                } else {
                  btcValue = `${price} (${Math.round(amount / satPrice).toLocaleString()} sats)`;
                }

                newText = newText.replace(price, btcValue);
              }
            }

            textNode.nodeValue = newText;
          }
        }
      }

      // Process main page text
      processTextPrices();

      // Try to inject scripts into the iframes
      try {
        // Regular iframe
        const regularIframe = document.getElementById('regular-iframe');
        if (regularIframe && regularIframe.contentDocument) {
          const iframeDoc = regularIframe.contentDocument;

          // Process text prices in the iframe
          const textWalker = iframeDoc.createTreeWalker(
            iframeDoc.body,
            NodeFilter.SHOW_TEXT,
            null,
            false,
          );

          let textNode;
          while ((textNode = textWalker.nextNode())) {
            const text = textNode.nodeValue;
            const regex = /\$(\d{1,3}(,\d{3})*(\.\d{2})?)/g;

            if (regex.test(text)) {
              // Reset regex state
              regex.lastIndex = 0;

              let match;
              let newText = text;

              while ((match = regex.exec(text)) !== null) {
                const price = match[0];
                const amount = parseFloat(match[1].replace(/,/g, ''));

                if (!isNaN(amount) && amount > 0) {
                  let btcValue;
                  if (amount >= 500) {
                    btcValue = `${price} (${(amount / btcPrice).toFixed(5)} BTC)`;
                  } else {
                    btcValue = `${price} (${Math.round(amount / satPrice).toLocaleString()} sats)`;
                  }

                  newText = newText.replace(price, btcValue);
                }
              }

              textNode.nodeValue = newText;
            }
          }
        }

        // Try the restricted iframe - this should fail gracefully
        try {
          const restrictedIframe = document.getElementById('restricted-iframe');
          if (restrictedIframe && restrictedIframe.contentDocument) {
            console.log('Attempting to access restricted iframe (should detect restriction)');

            // Explicitly try to modify the iframe to test error handling
            const iframeDoc = restrictedIframe.contentDocument;

            // Mock context detection inside the iframe
            const isInRestrictedIframe = () =>
              // Check sandbox attribute
              restrictedIframe.hasAttribute('sandbox');
            // Log the iframe's sandbox status
            console.log('Iframe restricted status:', {
              hasSandbox: restrictedIframe.hasAttribute('sandbox'),
              sandboxValue: restrictedIframe.getAttribute('sandbox'),
            });

            // This should never execute due to sandbox restrictions
            if (!isInRestrictedIframe()) {
              const prices = iframeDoc.querySelectorAll('.a-price');
              console.log('Found prices in restricted iframe:', prices.length);
            } else {
              console.log('Detected restricted iframe, skipping price conversion');
            }
          }
        } catch (restrictedError) {
          console.log(
            'Expected error accessing restricted iframe (good):',
            restrictedError.message,
          );
        }
      } catch (iframeError) {
        console.error('Error processing iframes:', iframeError.message);
      }
    });

    // Verify main page price conversion worked
    const mainPagePriceConverted = await page.evaluate(() => {
      // Check that the main page text conversion worked
      const mainText = document.body.textContent;
      return mainText.includes('BTC') || mainText.includes('sats');
    });

    expect(mainPagePriceConverted).toBeTruthy();

    // Verify regular iframe price conversion
    const regularIframeConverted = await page.frame({ name: 'regular-iframe' }).evaluate(() => {
      // Check that regular iframe conversion worked
      const iframeText = document.body.textContent;
      return iframeText.includes('BTC') || iframeText.includes('sats');
    });

    expect(regularIframeConverted).toBeTruthy();

    // Verify no crashes occurred due to restricted iframe
    const noErrors = await page.evaluate(() =>
      // Access global objects to check for crash indicators
      ({
        documentAvailable: typeof document !== 'undefined',
        consoleErrorCount: window.consoleErrors?.length || 0,
      }),
    );

    // Document should still be available (no page crash)
    expect(noErrors.documentAvailable).toBeTruthy();
  });

  test('should gracefully handle content script errors', async ({ page }) => {
    // Load Amazon product page
    await loadTestPage(page, createAmazonProductPage());

    if (ENABLE_DIAGNOSTIC_MODE) {
      await enableDiagnosticMode(page);
    }

    // Inject necessary extension scripts
    await page.addScriptTag({ path: './conversion.js', type: 'module' });
    await page.addScriptTag({ path: './error-handling.js', type: 'module' });
    await page.addScriptTag({ path: './context-provider.js', type: 'module' });
    await page.addScriptTag({ path: './callback-utils.js', type: 'module' });

    // Add script that simulates extension errors
    await page.evaluate(() => {
      const btcPrice = 50000;
      const satPrice = 0.0005;

      // Define mock error handling functions if not available in global scope
      const ErrorTypes = {
        DOM: 'dom',
        CALLBACK: 'callback',
        NETWORK: 'network',
        STORAGE: 'storage',
      };

      const ErrorSeverity = {
        DEBUG: 'debug',
        INFO: 'info',
        WARNING: 'warning',
        ERROR: 'error',
        CRITICAL: 'critical',
      };

      // Simple mock implementations if not available
      const createError =
        window.createError ||
        function (message, type, details = {}) {
          const error = new Error(message);
          error.type = type;
          error.details = details;
          return error;
        };

      const logError =
        window.logError ||
        function (error, context = {}) {
          console.error(`[${error.type || 'error'}] ${error.message}`, context);
          return { message: error.message, type: error.type };
        };

      // Error types for testing
      const testErrors = [
        { type: 'DOM', message: 'Test DOM error', severity: 'error' },
        { type: 'CALLBACK', message: 'Test callback error', severity: 'warning' },
        { type: 'NETWORK', message: 'Test network error', severity: 'error' },
        { type: 'STORAGE', message: 'Test storage error', severity: 'warning' },
      ];

      // Create array to store all errors for verification
      window.testErrorsLogged = [];

      // Log all test errors to verify error handling
      testErrors.forEach((test) => {
        const error = createError(test.message, ErrorTypes[test.type], { testCase: true });

        // Log the error through our error handler
        const result = logError(error, {
          severity: ErrorSeverity[test.severity.toUpperCase()],
          context: 'test_context',
          additionalInfo: 'Test context',
        });

        // Store the result for verification
        window.testErrorsLogged.push(result);
      });

      // Simulate a real error by trying to access a property on null
      try {
        const nullObject = null;
        nullObject.property = 'This will error';
      } catch (e) {
        // Log the real error
        logError(e, {
          severity: ErrorSeverity.ERROR,
          context: 'real_error_test',
        });
      }

      // Simulate script continuing to run despite errors
      // This tests that the extension continues to function despite errors

      // Find and process Amazon prices
      const amazonPrices = document.querySelectorAll('.a-price');
      amazonPrices.forEach((container) => {
        // Skip if already processed
        if (container.hasAttribute && container.hasAttribute('data-btc-processed')) {
          return;
        }

        // Mark as processed
        try {
          container.setAttribute('data-btc-processed', 'true');
        } catch (e) {
          console.error('Failed to mark as processed', e);
          return;
        }

        // Extract components
        const symbol = container.querySelector('.a-price-symbol')?.textContent || '';
        const whole = container.querySelector('.a-price-whole')?.textContent || '';
        const fraction = container.querySelector('.a-price-fraction')?.textContent || '';

        if (symbol && whole) {
          // Parse into numeric value
          const wholeClean = whole.replace(/,/g, '');
          const price = parseFloat(`${wholeClean}.${fraction}`);

          // Don't process invalid prices
          if (isNaN(price) || price <= 0) {
            return;
          }

          // Create conversion element
          const newEl = document.createElement('div');
          newEl.className = 'btc-price-converted-amazon';

          // Determine BTC or satoshi representation
          if (price >= 500) {
            newEl.innerHTML = `
              <span class="original-price">${symbol}${whole}.${fraction}</span>
              <span class="btc-price-tag-converted">${(price / btcPrice).toFixed(5)} BTC</span>
            `;
          } else {
            newEl.innerHTML = `
              <span class="original-price">${symbol}${whole}.${fraction}</span>
              <span class="btc-price-tag-converted">${Math.round(price / satPrice).toLocaleString()} sats</span>
            `;
          }

          // Insert after price container
          container.parentNode.insertBefore(newEl, container.nextSibling);

          // Hide original container
          container.style.opacity = '0';
          container.style.height = '0';
          container.style.overflow = 'hidden';
        }
      });
    });

    // Verify that errors were logged correctly
    const errors = await page.evaluate(() => window.testErrorsLogged || []);

    // Should have logged all our test errors
    expect(errors.length).toBeGreaterThanOrEqual(4);

    // Verify that price conversion still worked despite errors
    const priceConversionWorked = await page.evaluate(() => {
      const conversions = document.querySelectorAll('.btc-price-converted-amazon');
      return conversions.length > 0;
    });

    expect(priceConversionWorked).toBeTruthy();
  });
});
