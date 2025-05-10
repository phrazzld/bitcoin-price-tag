/**
 * Mock extension environment for browser compatibility tests
 */

/**
 * Create a mock extension environment in the browser
 * This is needed because Playwright cannot directly interact with extension contexts
 */
export function createMockExtensionEnvironment() {
  // Mock Chrome API if it doesn't exist
  if (typeof chrome === 'undefined') {
    window.chrome = {
      runtime: {
        sendMessage: (message, callback) => {
          // Mock Bitcoin price data for testing
          if (message && message.action === 'getBitcoinPrice') {
            setTimeout(() => {
              callback({
                btcPrice: 50000, // $50,000 per BTC
                satPrice: 0.0005, // $0.0005 per sat
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
      },
      storage: {
        local: {
          get: (key, callback) => {
            callback({});
          },
          set: () => {},
        },
      },
    };
  }

  // Flag to track if the environment has been initialized
  window._mockExtensionInitialized = true;
}

/**
 * Inject the extension's functionality directly into the page for testing
 * @param {string} conversionScriptUrl - URL to the conversion.js script
 * @param {string} contentScriptUrl - URL to the content.js script
 */
export async function injectExtensionScripts(conversionScriptUrl, contentScriptUrl) {
  // Only initialize once
  if (window._mockExtensionInitialized) {
    return;
  }

  // Create mock extension environment
  createMockExtensionEnvironment();

  // Load scripts
  try {
    // First load conversion.js
    const conversionModule = await import(conversionScriptUrl);
    window.conversion = conversionModule;

    // Then load content.js which depends on conversion.js
    await import(contentScriptUrl);

    // Use allowed console methods only (debug instead of log)
    console.debug('Extension scripts loaded successfully');
  } catch (error) {
    console.error('Failed to load extension scripts:', error);
  }
}
