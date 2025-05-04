/**
 * Bootstrap module for Bitcoin Price Tag
 * 
 * This file serves as the entry point for the module system,
 * importing the main content module and initializing it.
 */

// First import context detection functions to perform early checks
import { isInRestrictedIframe, isAmazonRestrictedIframe } from '/dom-scanner.js';
import { logContextDetection } from '/error-handling.js';

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
      }
    };
    
    // Combine the results to determine if we should exit
    contextState.isRestricted = iframeRestrictions.restricted || 
                             (amazonRestrictions.isAmazon && amazonRestrictions.restricted);
    
    // Set the reason based on which check failed
    if (contextState.isRestricted) {
      contextState.restrictionReason = amazonRestrictions.restricted ? 
                                   `Amazon restricted frame: ${amazonRestrictions.reason}` : 
                                   `Restricted iframe: ${iframeRestrictions.reason}`;
    }
    
    // Log this context detection, specifying if it's an early exit
    logContextDetection(contextState, 'bootstrap', contextState.isRestricted);
    
    // Return false if restricted, true otherwise
    return !contextState.isRestricted;
  } catch (error) {
    // If context detection itself fails, assume it's unsafe and exit
    console.warn('Bitcoin Price Tag: Error in bootstrap context detection, exiting early', error.message);
    
    // Create an error context state
    const errorContext = {
      isRestricted: true,
      restrictionReason: 'detection_error',
      isAmazonFrame: false,
      details: { error: error.message }
    };
    
    // Log this as an early exit due to error
    logContextDetection(errorContext, 'bootstrap', true);
    
    return false;
  }
}

// Only import and initialize if context check passes
if (checkContextBeforeInit()) {
  // Lazy import the main module only if we pass the context check
  import('/content-module.js')
    .then(module => {
      // Initialize the module
      try {
        module.initBitcoinPriceTag();
        console.log('Bitcoin Price Tag module initialized successfully');
      } catch (error) {
        console.error('Bitcoin Price Tag module initialization error:', error);
      }
    })
    .catch(error => {
      console.error('Bitcoin Price Tag bootstrap module import error:', error);
    });
} else {
  // Log that we're skipping initialization
  console.debug('Bitcoin Price Tag: Skipping module initialization due to context restrictions');
}