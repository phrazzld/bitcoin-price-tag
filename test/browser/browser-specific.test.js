/**
 * Browser-specific compatibility tests for Bitcoin Price Tag extension
 */

import { test, expect } from '@playwright/test';

import { loadTestPage } from './test-helpers.js';

// Tests for browser-specific features and behaviors
test.describe('Browser-Specific Features', () => {
  test.beforeEach(async ({ page, browserName }) => {
    // Setup mock environment for each test
    await page.addInitScript(`
      // Mock Chrome API
      window.chrome = {
        runtime: {
          sendMessage: (message, callback) => {
            if (message && message.action === 'getBitcoinPrice') {
              setTimeout(() => {
                callback({
                  btcPrice: 50000,
                  satPrice: 0.0005,
                  timestamp: Date.now()
                });
              }, 100);
            }
          },
          onMessage: {
            addListener: () => {},
            removeListener: () => {}
          },
          lastError: null
        },
        storage: {
          local: {
            get: (key, callback) => {
              callback({});
            },
            set: () => {}
          }
        }
      };
    `);

    console.log(`Running browser-specific test in ${browserName}`);
  });

  // Test handling of textContent vs innerText (browser differences)
  test('should handle textContent vs innerText differences', async ({ page, browserName }) => {
    // Create a page with some hidden text
    await loadTestPage(
      page,
      `
      <html>
        <head><title>Text Content Test</title></head>
        <body>
          <div id="visible-price">Visible price: $199.99</div>
          <div style="display: none" id="hidden-price">Hidden price: $299.99</div>
          <div>
            Mixed content:
            <span>$99.99</span>
            <style>
              /* Some CSS that shouldn't be processed */
              .price { color: green; }
            </style>
          </div>
        </body>
      </html>
    `,
    );

    // Test processing text content
    await page.addScriptTag({ path: './conversion.js', type: 'module' });

    // Process text using both innerText and textContent to check browser differences
    const results = await page.evaluate(() => {
      const btcPrice = 50000;
      const satPrice = 0.0005;

      // Function to process currency in text
      function processCurrency(text) {
        return text.replace(/\$(\d+(\,\d+)?(\.\d+)?)/g, (match, amount) => {
          const numAmount = parseFloat(amount.replace(/,/g, ''));
          if (numAmount >= 500) {
            return `${match} (${(numAmount / btcPrice).toFixed(3)} BTC)`;
          } else {
            return `${match} (${Math.round(numAmount / satPrice).toLocaleString()} sats)`;
          }
        });
      }

      // Test both text properties
      const visibleDiv = document.getElementById('visible-price');
      const hiddenDiv = document.getElementById('hidden-price');

      // Try both methods and store results
      return {
        visibleTextContent: processCurrency(visibleDiv.textContent),
        visibleInnerText: processCurrency(visibleDiv.innerText),
        hiddenTextContent: processCurrency(hiddenDiv.textContent),
        hiddenInnerText: hiddenDiv.innerText,
        browserInfo: {
          userAgent: navigator.userAgent,
          browserName: navigator.appName,
          browserVersion: navigator.appVersion,
        },
      };
    });

    // All browsers should handle textContent properly
    expect(results.visibleTextContent).toContain('$199.99');
    expect(results.visibleTextContent).toContain('sats');

    // Visible content should be processed with innerText in all browsers
    expect(results.visibleInnerText).toContain('$199.99');
    expect(results.visibleInnerText).toContain('sats');

    // Check browser-specific behaviors
    if (browserName === 'chromium') {
      // Chrome-specific test for innerText behavior
      expect(results.hiddenInnerText).toBe('');
    }
  });

  // Test CSS Selector compatibility
  test('should handle CSS selector differences', async ({ page, browserName }) => {
    // Create a page with complex selectors to test
    await loadTestPage(
      page,
      `
      <html>
        <head>
          <title>CSS Selector Test</title>
          <style>
            .price::after { content: " (plus tax)"; }
          </style>
        </head>
        <body>
          <div>
            <span class="price">$99.99</span>
            <span class="price special">$199.99</span>
            <div class="container">
              <span class="price">$299.99</span>
            </div>
          </div>
        </body>
      </html>
    `,
    );

    // Test CSS selector compatibility
    await page.addScriptTag({ path: './conversion.js', type: 'module' });
    const selectorResults = await page.evaluate(() => {
      const results = {};

      // Test basic selectors across browsers
      results.basicSelector = document.querySelectorAll('.price').length;

      // Test complex selectors
      results.complexSelector = document.querySelectorAll('.price.special').length;
      results.nestedSelector = document.querySelectorAll('.container .price').length;

      // Test selector for pseudo-elements (browser differences)
      try {
        results.pseudoElementAccessible = !!document.querySelector('.price::after');
      } catch (e) {
        results.pseudoElementAccessible = false;
        results.pseudoElementError = e.message;
      }

      return results;
    });

    // Basic selectors should work in all browsers
    expect(selectorResults.basicSelector).toBe(3);
    expect(selectorResults.complexSelector).toBe(1);
    expect(selectorResults.nestedSelector).toBe(1);

    // Pseudo-element handling varies by browser
    // Just log the result for now as expectations vary
    console.log(
      `Pseudo-element handling in ${browserName}:`,
      selectorResults.pseudoElementAccessible ? 'Accessible' : 'Not accessible',
    );
  });

  // Test MutationObserver API compatibility (used for dynamic content)
  test('should handle MutationObserver API correctly', async ({ page, browserName }) => {
    // Create a page to test MutationObserver
    await loadTestPage(
      page,
      `
      <html>
        <head><title>MutationObserver Test</title></head>
        <body>
          <div id="container">
            <div id="price-display">$99.99</div>
            <button id="add-price">Add Price</button>
          </div>
        </body>
      </html>
    `,
    );

    // Test MutationObserver behavior
    const observerResults = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const results = {
            initialPrice: document.getElementById('price-display').textContent,
            mutations: [],
            supported: typeof MutationObserver !== 'undefined',
          };

          if (!results.supported) {
            resolve(results);
            return;
          }

          // Create a MutationObserver to watch for DOM changes
          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              if (mutation.type === 'childList') {
                results.mutations.push({
                  type: mutation.type,
                  addedNodes: mutation.addedNodes.length,
                  removedNodes: mutation.removedNodes.length,
                });
              } else if (mutation.type === 'characterData') {
                results.mutations.push({
                  type: mutation.type,
                  oldValue: mutation.oldValue,
                  newValue: mutation.target.textContent,
                });
              }
            }
          });

          // Start observing
          observer.observe(document.getElementById('container'), {
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: true,
          });

          // Make some DOM changes
          setTimeout(() => {
            // Change existing content
            document.getElementById('price-display').textContent = '$199.99';

            // Add new content
            const newElement = document.createElement('div');
            newElement.textContent = 'New price: $299.99';
            document.getElementById('container').appendChild(newElement);

            // Wait for observer to process changes
            setTimeout(() => {
              observer.disconnect();
              resolve(results);
            }, 100);
          }, 100);
        }),
    );

    // MutationObserver should be supported in all modern browsers
    expect(observerResults.supported).toBeTruthy();

    // We should have observed mutations
    expect(observerResults.mutations.length).toBeGreaterThan(0);

    // The initial price should be correct
    expect(observerResults.initialPrice).toBe('$99.99');
  });
});
