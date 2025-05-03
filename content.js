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

// Import cache manager utilities
import {
  cachePriceData,
  getCachedPriceData,
  shouldRefreshCache,
  determineCacheFreshness,
  isOffline,
  CACHE_KEYS,
  CACHE_FRESHNESS
} from './cache-manager.js';

// Import debouncing utilities
import {
  debounce,
  throttle,
  batchProcessor
} from './debounce.js';

// Import optimized DOM scanning utilities
import {
  convertPriceText,
  scanDomForPrices,
  setupMutationObserver as setupOptimizedMutationObserver,
  initScanning
} from './dom-scanner.js';

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

// Legacy convert function - maintained for backward compatibility with tests
const convert = (textNode) => {
  return convertPriceText(textNode, btcPrice, satPrice);
};

// Legacy walk function - maintained for backward compatibility
// Credit to t-j-crowder on StackOverflow for the original version
// http://bit.ly/1o47R7V
const walk = (node) => {
  // Use the optimized scanner instead of the original recursive algorithm
  scanDomForPrices(node, btcPrice, satPrice);
};

/**
 * Checks for cached price data using cache manager
 * This now uses the multi-source cache system from cache-manager
 * @returns {Promise<Object|null>} - Cached price data or null
 */
const getLocalCachedPriceData = async () => {
  try {
    // Use cache-manager to get data from all cache sources
    const cachedData = await getCachedPriceData();
    if (cachedData) {
      return {
        ...cachedData,
        fromLocalCache: true,
        localCacheAge: Date.now() - cachedData.timestamp,
        freshness: determineCacheFreshness(cachedData.timestamp)
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
 * Stores price data using cache manager
 * This now uses the multi-source cache system from cache-manager
 * @param {Object} priceData - The price data to cache
 */
const storeLocalCache = async (priceData) => {
  try {
    if (priceData && priceData.btcPrice) {
      await cachePriceData({
        btcPrice: priceData.btcPrice,
        satPrice: priceData.satPrice,
        timestamp: priceData.timestamp || Date.now(),
        source: priceData.source || 'content_script'
      });
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
    const localCache = await getLocalCachedPriceData();
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
    const localCache = await getLocalCachedPriceData();
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
 * Enhanced with error handling and optimized DOM scanning
 * @param {Object} priceData - The price data to use
 */
const processPage = async (priceData) => {
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
    
    // Initialize scanning with the optimized algorithm
    initScanning(document, btcPrice, satPrice);
    
    // If everything succeeded, store the data locally as an additional cache layer
    // This is now asynchronous but we don't need to await it since DOM processing can continue
    storeLocalCache(priceData).catch(cacheError => {
      logError(cacheError, {
        severity: ErrorSeverity.WARNING,
        context: 'process_page_cache'
      });
    });
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
    initScanning(document, btcPrice, satPrice);
  }
};

/**
 * Try to refresh price data in the background
 * This doesn't affect the current display but prepares for future page loads
 * This function is not debounced itself, but uses the debounced API
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
 * Debounced version of backgroundRefresh
 * Only triggers once every 5 minutes
 */
const debouncedBackgroundRefresh = debounce(backgroundRefresh, 5 * 60 * 1000);

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
      // First check for offline status
      const offline = isOffline();
      
      // Check if we have cached data that we can use immediately
      const cachedData = await getLocalCachedPriceData();
      const refreshInfo = shouldRefreshCache(cachedData);
      
      // If we have usable cache, use it immediately, then maybe refresh in background
      if (cachedData && (!refreshInfo.immediately || offline)) {
        // Process the page with cached data immediately
        await processPage({
          ...cachedData,
          offlineMode: offline,
          fromCache: true
        });
        
        // If we're online and should refresh (but not immediately), do it in background
        if (!offline && refreshInfo.shouldRefresh) {
          console.debug('Bitcoin Price Tag: Using cache while refreshing in background');
          try {
            const freshData = await getBitcoinPrice();
            // If we got new data and it's actually different, update the page
            if (freshData && freshData.btcPrice !== cachedData.btcPrice) {
              // Only re-process if price actually changed
              await processPage(freshData);
            }
          } catch (backgroundError) {
            // Just log, don't disrupt the user experience
            logError(backgroundError, {
              severity: ErrorSeverity.INFO,
              context: 'background_refresh_error'
            });
          }
        }
      } else {
        // No usable cache or cache needs immediate refresh: get fresh data
        const priceData = await getBitcoinPrice();
        await processPage(priceData);
      }
    } catch (priceError) {
      // Handle errors in getting price data
      logError(priceError, {
        severity: ErrorSeverity.ERROR,
        context: 'get_price_init'
      });
      
      // Try to use locally cached data
      const localCache = await getLocalCachedPriceData();
      if (localCache) {
        await processPage({
          ...localCache,
          warning: 'Using locally cached data due to error'
        });
      } else {
        // Use emergency data as last resort
        await processPage(createEmergencyPriceData());
      }
    }
    
    // Set up MutationObserver for dynamic content if supported
    if (featureSupport.mutationObserver) {
      setupMutationObserver();
    }
    
    // Schedule a debounced background refresh
    // The function itself is debounced, so we can call it immediately
    // It will only execute after 5 minutes of inactivity
    debouncedBackgroundRefresh();
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
  // Use the optimized MutationObserver implementation
  return setupOptimizedMutationObserver(document, btcPrice, satPrice, adaptations.observerConfig);
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
