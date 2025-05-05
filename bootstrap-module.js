/**
 * Bootstrap module for Bitcoin Price Tag
 *
 * This file serves as the entry point for the module system,
 * importing the main content module and initializing it.
 */

// First import context detection functions to perform early checks
import { isInRestrictedIframe, isAmazonRestrictedIframe } from '/dom-scanner.js';
import { logContextDetection } from '/error-handling.js';

// Define Node if not already defined (for environments where DOM API Node is not available)
if (typeof Node === 'undefined') {
  // Create a simple polyfill just for type checking
  window.Node = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
  };
}

// Early context detection before any other imports
function checkContextBeforeInit() {
  try {
    // Check for general iframe restrictions
    const iframeRestrictions = isInRestrictedIframe();

    // Check for Amazon-specific restrictions
    const amazonRestrictions = isAmazonRestrictedIframe();

    // Build a combined context state object
    const contextState = {
      isRestricted: false,
      restrictionReason: null,
      isAmazonFrame: amazonRestrictions.isAmazon && amazonRestrictions.details.isIframe,
      details: {
        iframeRestrictions,
        amazonRestrictions: amazonRestrictions.isAmazon ? amazonRestrictions : null,
      },
    };

    // Combine the results to determine if we should exit
    contextState.isRestricted =
      iframeRestrictions.restricted ||
      (amazonRestrictions.isAmazon && amazonRestrictions.restricted);

    // Set the reason based on which check failed
    if (contextState.isRestricted) {
      contextState.restrictionReason = amazonRestrictions.restricted
        ? `Amazon restricted frame: ${amazonRestrictions.reason}`
        : `Restricted iframe: ${iframeRestrictions.reason}`;
    }

    // Log this context detection, specifying if it's an early exit
    logContextDetection(contextState, 'bootstrap', contextState.isRestricted);

    // Return false if restricted, true otherwise
    return !contextState.isRestricted;
  } catch (error) {
    // If context detection itself fails, assume it's unsafe and exit
    console.warn(
      'Bitcoin Price Tag: Error in bootstrap context detection, exiting early',
      error.message,
    );

    // Create an error context state
    const errorContext = {
      isRestricted: true,
      restrictionReason: 'detection_error',
      isAmazonFrame: false,
      details: { error: error.message },
    };

    // Log this as an early exit due to error
    logContextDetection(errorContext, 'bootstrap', true);

    return false;
  }
}

// Only import and initialize if context check passes
if (checkContextBeforeInit()) {
  // Wrap the import in a try-catch
  try {
    console.debug('Bitcoin Price Tag: Bootstrap starting module import');

    // Lazy import the main module only if we pass the context check
    import('/content-module.js')
      .then((module) => {
        // Initialize the module
        try {
          console.debug('Bitcoin Price Tag: Content module imported successfully, initializing');
          module.initBitcoinPriceTag();
          console.log('Bitcoin Price Tag module initialized successfully');
        } catch (error) {
          console.error('Bitcoin Price Tag: Module initialization error:', {
            message: error.message,
            stack: error.stack ? error.stack.split('\n')[0] : 'no stack available',
            timestamp: new Date().toISOString(),
          });
        }
      })
      .catch((error) => {
        console.error('Bitcoin Price Tag: Bootstrap module import error:', {
          message: error.message,
          type: error.name,
          stack: error.stack ? error.stack.split('\n')[0] : 'no stack available',
          timestamp: new Date().toISOString(),
        });

        // Try fallback approach if import failed
        tryFallbackInitialization();
      });
  } catch (bootstrapError) {
    console.error('Bitcoin Price Tag: Critical bootstrap error:', {
      message: bootstrapError.message,
      stack: bootstrapError.stack ? bootstrapError.stack.split('\n')[0] : 'no stack available',
      timestamp: new Date().toISOString(),
    });

    // Try fallback as last resort
    tryFallbackInitialization();
  }
} else {
  // Log that we're skipping initialization
  console.debug('Bitcoin Price Tag: Skipping module initialization due to context restrictions');
}

/**
 * Attempt a minimal functionality initialization when module system fails
 */
function tryFallbackInitialization() {
  try {
    console.debug('Bitcoin Price Tag: Attempting minimal functionality initialization');

    // Create a minimal object with core functionality
    window.bitcoinPriceTagMinimal = {
      btcPrice: 50000, // Default price
      satPrice: 0.0005,

      // Load price data if bridge is available
      loadPriceData: function () {
        if (
          typeof window.bitcoinPriceTagBridge !== 'undefined' &&
          typeof window.bitcoinPriceTagBridge.getFallbackPriceData === 'function'
        ) {
          try {
            const priceData = window.bitcoinPriceTagBridge.getFallbackPriceData();
            if (priceData && typeof priceData === 'object') {
              this.btcPrice = priceData.btcPrice || this.btcPrice;
              this.satPrice = priceData.satPrice || this.satPrice;
              console.debug('Bitcoin Price Tag: Loaded fallback price data in bootstrap');
              return true;
            }
          } catch (dataError) {
            console.debug(
              'Bitcoin Price Tag: Failed to get fallback price data in bootstrap:',
              dataError.message,
            );
          }
        }
        return false;
      },
    };

    // Try to load price data
    window.bitcoinPriceTagMinimal.loadPriceData();

    console.debug('Bitcoin Price Tag: Minimal fallback initialization completed in bootstrap');
  } catch (fallbackError) {
    console.error('Bitcoin Price Tag: Failed minimal initialization:', fallbackError.message);
  }
}
