// Import conversion functions
import {
  buildPrecedingMatchPattern,
  buildConcludingMatchPattern,
  extractNumericValue,
  getMultiplier,
  valueInSats,
  valueInBtc,
  makeSnippet,
  calculateSatPrice
} from './conversion.js';

// Import browser detection utility
import { detectBrowser, checkFeatureSupport, getBrowserAdaptations, applyPolyfills } from './browser-detect.js';

// Import error handling utilities
import { 
  ErrorTypes, 
  ErrorSeverity, 
  logError, 
  categorizeError, 
  createError, 
  withTimeout
} from './error-handling.js';

// Global price variables
let btcPrice;
let satPrice;

// Apply browser-specific adaptations
const browserInfo = detectBrowser();
const featureSupport = checkFeatureSupport();
const adaptations = getBrowserAdaptations();

// Apply polyfills if necessary
if (!featureSupport.isSupported) {
  applyPolyfills();
}

// Convert prices in a text node
const convert = (textNode) => {
  let sourceMoney;
  // Currency indicator preceding amount
  let matchPattern = buildPrecedingMatchPattern();
  textNode.nodeValue = textNode.nodeValue.replace(matchPattern, function (e) {
    let multiplier = getMultiplier(e);
    sourceMoney = extractNumericValue(e).toFixed(2);
    return makeSnippet(e, sourceMoney * multiplier, btcPrice, satPrice);
  });
  // Currency indicator concluding amount
  matchPattern = buildConcludingMatchPattern();
  textNode.nodeValue = textNode.nodeValue.replace(matchPattern, function (e) {
    let multiplier = getMultiplier(e);
    sourceMoney = extractNumericValue(e).toFixed(2);
    return makeSnippet(e, sourceMoney * multiplier, btcPrice, satPrice);
  });
};

// Credit to t-j-crowder on StackOverflow for this walk function
// http://bit.ly/1o47R7V
// Enhanced with browser compatibility features
const walk = (node) => {
  let child, next, price;

  // For safety, check if node exists
  if (!node) return;

  // Use appropriate text property based on browser detection
  const textProperty = adaptations.textPropertyToUse;

  switch (node.nodeType) {
    case 1: // Element
    case 9: // Document
    case 11: // Document fragment
      // Skip certain elements that should not be processed
      const tagName = node.tagName && node.tagName.toLowerCase();
      if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
        return;
      }

      child = node.firstChild;
      while (child) {
        next = child.nextSibling;

        try {
          // Check if child is Amazon display price
          const classes = child.classList;
          if (
            classes &&
            ["sx-price-currency", "a-price-symbol"].includes(classes.value) &&
            child.firstChild
          ) {
            price = child.firstChild.nodeValue?.toString() || '';
            child.firstChild.nodeValue = null;
          } else if (
            classes &&
            ["sx-price-whole", "a-price-whole", "a-price-decimal"].includes(
              classes.value
            ) &&
            child.firstChild &&
            next?.firstChild
          ) {
            price = (price || '') +
              (child.firstChild.nodeValue || '').toString() +
              "." +
              (next.firstChild.nodeValue || '').toString();
            child.firstChild.nodeValue = price;
            convert(child.firstChild);
            child = next;
          } else if (
            classes &&
            ["sx-price-fractional", "a-price-fraction"].includes(classes.value) &&
            child.firstChild
          ) {
            if (child.firstChild) {
              child.firstChild.nodeValue = null;
            }
            price = null;
          }
        } catch (e) {
          console.error('Error processing element:', e);
        }

        walk(child);
        child = next;
      }
      break;
    case 3: // Text node
      // Only process non-empty text nodes
      if (node.nodeValue && node.nodeValue.trim() !== '') {
        convert(node);
      }
      break;
  }
};

/**
 * Checks for locally cached price data in localStorage
 * This is separate from the background script's storage and serves as an additional fallback
 * @returns {Object|null} - Cached price data or null
 */
const getLocalCachedPriceData = () => {
  try {
    const cachedData = localStorage.getItem('btcPriceTagLocalCache');
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      return {
        ...parsedData,
        fromLocalCache: true,
        localCacheAge: Date.now() - parsedData.timestamp
      };
    }
    return null;
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.WARNING,
      context: 'local_cache_retrieval'
    });
    return null;
  }
};

/**
 * Stores price data in localStorage as an additional fallback cache
 * @param {Object} priceData - The price data to cache
 */
const storeLocalCache = (priceData) => {
  try {
    if (priceData && priceData.btcPrice) {
      localStorage.setItem('btcPriceTagLocalCache', JSON.stringify({
        btcPrice: priceData.btcPrice,
        satPrice: priceData.satPrice,
        timestamp: priceData.timestamp || Date.now(),
        source: priceData.source || 'local_cache'
      }));
    }
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.WARNING,
      context: 'local_cache_storage'
    });
  }
};

/**
 * Creates emergency fallback data when all else fails
 * @returns {Object} - Emergency price data
 */
const createEmergencyPriceData = () => {
  // These are very rough estimates that will be used only when all retrieval methods fail
  const estimatedPrice = 50000; // A reasonable BTC price as fallback
  return {
    btcPrice: estimatedPrice,
    satPrice: calculateSatPrice(estimatedPrice),
    timestamp: Date.now(),
    isEmergencyFallback: true,
    source: 'emergency_fallback',
    warning: 'Using estimated price - could not retrieve actual data'
  };
};

/**
 * Function to request Bitcoin price from the service worker
 * Enhanced with comprehensive error handling
 * @returns {Promise<Object>} - Bitcoin price data
 */
const getBitcoinPrice = async () => {
  // Check for chrome API access
  if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
    const error = createError(
      'Chrome runtime API not available',
      ErrorTypes.RUNTIME,
      { browserName: browserInfo.name }
    );
    logError(error, {
      severity: ErrorSeverity.ERROR,
      context: 'runtime_api_check'
    });
    
    // Try to get local cache as fallback
    const localCache = getLocalCachedPriceData();
    if (localCache) {
      return localCache;
    }
    
    // If in testing mode, return test data
    if (typeof window !== 'undefined' && window.TESTING_MODE) {
      return {
        btcPrice: 50000,
        satPrice: 0.0005,
        timestamp: Date.now(),
        source: 'test_data'
      };
    }
    
    // Emergency fallback
    return createEmergencyPriceData();
  }
  
  try {
    // Use withTimeout for automatic timeout handling
    return await withTimeout(
      new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({ action: 'getBitcoinPrice' }, (response) => {
            if (chrome.runtime.lastError) {
              const error = createError(
                `Chrome runtime error: ${chrome.runtime.lastError.message}`,
                ErrorTypes.RUNTIME,
                { originalError: chrome.runtime.lastError }
              );
              reject(error);
              return;
            }
            
            if (!response) {
              reject(createError('No response from service worker', ErrorTypes.RUNTIME));
              return;
            }
            
            // If the response has an error status, handle appropriately
            if (response.status === 'error') {
              // This means background script had an error but still returned data
              // We can use the data but should log the error
              logError(
                createError(
                  `Service worker reported error: ${response.error?.message || 'Unknown error'}`,
                  response.error?.type || ErrorTypes.UNKNOWN,
                  response.error
                ),
                {
                  severity: ErrorSeverity.WARNING,
                  context: 'background_reported_error'
                }
              );
              
              // If we have cached data in the response, use it
              if (response.btcPrice) {
                // Also cache locally
                storeLocalCache(response);
                resolve(response);
                return;
              }
              
              reject(createError(
                'Service worker error',
                ErrorTypes.RUNTIME,
                response.error
              ));
              return;
            }
            
            // Success case
            // Cache successfully retrieved data locally
            storeLocalCache(response);
            resolve(response);
          });
        } catch (error) {
          reject(createError(
            `Exception sending message: ${error.message}`,
            ErrorTypes.RUNTIME,
            { originalError: error }
          ));
        }
      }),
      10000, // 10 seconds timeout
      'Bitcoin price request timed out'
    );
  } catch (error) {
    // Handle all errors from the service worker request
    logError(error, {
      severity: ErrorSeverity.ERROR,
      context: 'service_worker_request'
    });
    
    // Try to get local cache as fallback
    const localCache = getLocalCachedPriceData();
    if (localCache) {
      // Add warning about using stale data
      return {
        ...localCache,
        warning: 'Using cached data due to API error',
        error: {
          message: error.message,
          type: error.type || categorizeError(error)
        }
      };
    }
    
    // Last resort emergency fallback
    return createEmergencyPriceData();
  }
};

/**
 * Check price data for warnings or errors and display indicators if necessary
 * @param {Object} priceData - The price data to check
 */
const handlePriceDataWarnings = (priceData) => {
  if (!priceData) return;
  
  // Check for warning flags in the price data
  if (priceData.isEmergencyFallback || 
      priceData.staleCacheWarning || 
      priceData.fromLocalCache || 
      priceData.warning) {
    
    // Log warnings for debugging
    console.warn('Bitcoin Price Tag: Using potentially outdated data', {
      source: priceData.source,
      cached: priceData.cached || priceData.fromLocalCache,
      warning: priceData.warning,
      timestamp: priceData.timestamp ? new Date(priceData.timestamp).toISOString() : 'unknown'
    });
    
    // In a real implementation, we could show a small UI indicator to the user
    // that the price data might be outdated
    // This would be done by injecting a small floating icon or badge
    // We're just logging for now
  }
  
  // Handle error information
  if (priceData.error) {
    logError(
      createError(
        priceData.error.message || 'Unknown error in price data',
        priceData.error.type || ErrorTypes.UNKNOWN,
        priceData.error
      ),
      {
        severity: ErrorSeverity.WARNING,
        context: 'price_data_error'
      }
    );
  }
};

/**
 * Process the page with Bitcoin price data
 * Enhanced with error handling
 * @param {Object} priceData - The price data to use
 */
const processPage = (priceData) => {
  try {
    // Check for valid price data
    if (!priceData || !priceData.btcPrice || isNaN(priceData.btcPrice) || priceData.btcPrice <= 0) {
      throw createError(
        'Invalid price data', 
        ErrorTypes.EXTENSION, 
        { receivedData: priceData }
      );
    }
    
    // Handle any warnings or errors
    handlePriceDataWarnings(priceData);
    
    // Save BTC and sat prices to globals
    btcPrice = priceData.btcPrice;
    satPrice = priceData.satPrice || calculateSatPrice(btcPrice);
    
    // Read the page and annotate prices with their equivalent bitcoin values
    walk(document.body);
    
    // If everything succeeded, store the data locally as an additional cache layer
    storeLocalCache(priceData);
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.ERROR,
      context: 'process_page'
    });
    
    // Try to use emergency data as absolute last resort
    const emergencyData = createEmergencyPriceData();
    btcPrice = emergencyData.btcPrice;
    satPrice = emergencyData.satPrice;
    
    // Still try to process the page with emergency data
    walk(document.body);
  }
};

/**
 * Try to refresh price data in the background
 * This doesn't affect the current display but prepares for future page loads
 */
const backgroundRefresh = async () => {
  try {
    const refreshMessage = { action: 'forceRefresh' };
    
    // We don't care about the immediate result, this is just to
    // ensure fresh data for future uses
    chrome.runtime.sendMessage(refreshMessage, (response) => {
      if (response && response.status === 'success') {
        console.debug('Bitcoin Price Tag: Background refresh successful');
      }
    });
  } catch (error) {
    // Just log, don't throw - this is a non-critical operation
    logError(error, {
      severity: ErrorSeverity.INFO,
      context: 'background_refresh'
    });
  }
};

/**
 * Initialize the extension by getting price and processing the page
 * Enhanced with comprehensive error handling
 */
const init = async () => {
  try {
    // Check if the browser is supported before proceeding
    if (!featureSupport.isSupported) {
      console.warn('Bitcoin Price Tag: Browser may not fully support all required features');
      // Apply polyfills again just to be safe
      applyPolyfills();
    }
    
    // Log browser information for debugging
    console.debug('Bitcoin Price Tag running on:', browserInfo.name, browserInfo.version);
    
    // Set up error handling for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && 
          event.reason.message.includes('Bitcoin Price Tag')) {
        // It's our extension's error
        logError(
          createError(
            `Unhandled rejection: ${event.reason.message}`,
            categorizeError(event.reason),
            { originalError: event.reason }
          ),
          {
            severity: ErrorSeverity.ERROR,
            context: 'unhandled_rejection'
          }
        );
        
        // Prevent it from being reported to the console
        event.preventDefault();
      }
    });
    
    try {
      // Request Bitcoin price from service worker
      const priceData = await getBitcoinPrice();
      processPage(priceData);
    } catch (priceError) {
      // Handle errors in getting price data
      logError(priceError, {
        severity: ErrorSeverity.ERROR,
        context: 'get_price_init'
      });
      
      // Try to use locally cached data
      const localCache = getLocalCachedPriceData();
      if (localCache) {
        processPage({
          ...localCache,
          warning: 'Using locally cached data due to error'
        });
      } else {
        // Use emergency data as last resort
        processPage(createEmergencyPriceData());
      }
    }
    
    // Set up MutationObserver for dynamic content if supported
    if (featureSupport.mutationObserver) {
      setupMutationObserver();
    }
    
    // Schedule a background refresh after 5 minutes
    setTimeout(backgroundRefresh, 5 * 60 * 1000);
  } catch (error) {
    // This is the outermost try-catch to ensure the extension doesn't crash the page
    logError(error, {
      severity: ErrorSeverity.CRITICAL,
      context: 'init_critical'
    });
    console.error('Bitcoin Price Tag: Critical initialization error', error);
  }
};

// Set up MutationObserver to handle dynamically added content
function setupMutationObserver() {
  // Use browser-specific adaptation settings
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Process newly added nodes
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          // Only process element nodes
          if (node.nodeType === 1) {
            walk(node);
          }
        }
      }
    }
  });
  
  // Start observing with browser-specific configuration
  observer.observe(document.body, adaptations.observerConfig);
}

// Function to determine optimal delay based on browser and page complexity
function getOptimalDelay() {
  // Default delay
  let delay = 2500;
  
  // Adjust based on browser
  if (browserInfo.isFirefox) {
    delay = 3000; // Firefox might need a bit more time
  } else if (browserInfo.isSafari) {
    delay = 3000; // Safari also needs more time
  }
  
  // Adjust based on page complexity
  const pageComplexity = document.querySelectorAll('*').length;
  if (pageComplexity > 5000) {
    delay += 1000; // Add more delay for complex pages
  }
  
  return delay;
}

// Run initialization after a short delay to ensure page is fully loaded
// Use browser-specific optimal delay
setTimeout(init, getOptimalDelay());
