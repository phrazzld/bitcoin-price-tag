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
} from '/conversion.js';

// Import browser detection utility
import { detectBrowser, checkFeatureSupport, getBrowserAdaptations, applyPolyfills } from '/browser-detect.js';

// Import error handling utilities
import { 
  ErrorTypes, 
  ErrorSeverity, 
  logError, 
  categorizeError, 
  createError, 
  withTimeout,
  logContextDetection
} from '/error-handling.js';

// Import safe callback utilities
import {
  safeCallback,
  safeExecute,
  safeChromeCallback
} from '/callback-utils.js';

// Import cache manager utilities
import {
  cachePriceData,
  getCachedPriceData,
  shouldRefreshCache,
  determineCacheFreshness,
  isOffline,
  CACHE_KEYS,
  CACHE_FRESHNESS
} from '/cache-manager.js';

// Import debouncing utilities
import {
  debounce,
  throttle,
  batchProcessor
} from '/debounce.js';

// Import optimized DOM scanning utilities
import {
  convertPriceText,
  scanDomForPrices,
  setupMutationObserver as setupOptimizedMutationObserver,
  initScanning,
  isInRestrictedIframe,
  isAmazonRestrictedIframe
} from '/dom-scanner.js';

// Global price variables
let btcPrice;
let satPrice;

/**
 * Comprehensive check for the execution context's safety
 * This centralizes all context detection logic for consistent early exits
 * @returns {Object} The context state with detailed information
 */
function checkExecutionContext() {
  const result = {
    isRestricted: false,
    restrictionReason: null,
    isAmazonFrame: false,
    details: {}
  };
  
  try {
    // Check for general iframe restrictions
    const iframeRestrictions = isInRestrictedIframe();
    result.details.iframeRestrictions = iframeRestrictions;
    
    // Check for Amazon-specific restrictions
    const amazonRestrictions = isAmazonRestrictedIframe();
    result.isAmazonFrame = amazonRestrictions.isAmazon && amazonRestrictions.details.isIframe;
    result.details.amazonRestrictions = amazonRestrictions;
    
    // Combine results to determine if we should exit
    result.isRestricted = iframeRestrictions.restricted || 
                         (amazonRestrictions.isAmazon && amazonRestrictions.restricted);
    
    // Set the reason based on which check failed
    if (result.isRestricted) {
      result.restrictionReason = amazonRestrictions.restricted ? 
                             `Amazon restricted frame: ${amazonRestrictions.reason}` : 
                             `Restricted iframe: ${iframeRestrictions.reason}`;
    }
    
    // Check for extension API access
    try {
      result.details.hasExtensionApi = typeof chrome !== 'undefined' && 
                                     typeof chrome.runtime !== 'undefined' && 
                                     typeof chrome.runtime.sendMessage === 'function';
      
      // Try to actively use the API to confirm it works
      if (result.details.hasExtensionApi) {
        try {
          // Getting the extension ID will throw in some restricted contexts
          const extensionId = chrome.runtime.id;
          result.details.extensionId = extensionId;
          result.details.apiAccessConfirmed = true;
        } catch (apiError) {
          result.details.apiAccessError = apiError.message;
          result.isRestricted = true;
          result.restrictionReason = result.restrictionReason || 'extension_api_blocked';
        }
      } else if (window !== window.top) {
        // If extension API is unavailable and we're in an iframe, mark as restricted
        result.isRestricted = true;
        result.restrictionReason = result.restrictionReason || 'extension_api_unavailable';
      }
    } catch (error) {
      // If checking for API access itself fails, that's a restriction
      result.isRestricted = true;
      result.restrictionReason = result.restrictionReason || 'api_check_error';
      result.details.apiCheckError = error.message;
    }
    
    return result;
  } catch (e) {
    // If our detection logic itself fails, assume restricted for safety
    console.warn('Bitcoin Price Tag: Error in context detection, assuming restricted', e.message);
    return {
      isRestricted: true,
      restrictionReason: 'detection_error',
      isAmazonFrame: false,
      details: { error: e.message }
    };
  }
}

// Perform early context check before any significant operations
const contextState = checkExecutionContext();

// If we're in a restricted context, exit very early to prevent any potential issues
if (contextState.isRestricted) {
  // Use structured logging for the early exit
  logContextDetection(contextState, 'content_script', true);
  
  // Note: We don't actually throw or return since this is top-level code,
  // but we'll use a flag to skip the remaining execution
  const SKIP_EXECUTION = true;
  
  // Exit point for restricted contexts
  if (SKIP_EXECUTION) {
    // Only export an empty API to avoid errors if something tries to use it
    const emptyApi = {
      convert: () => null,
      walk: () => null,
      getBitcoinPrice: async () => ({ btcPrice: 50000, satPrice: 0.0005, emergency: true }),
      processPage: () => null
    };
    
    // Set the API to empty implementation and exit
    // We'll export at top level later
    window._emptyBitcoinPriceTagApi = emptyApi;
    // This will end execution of this module
    throw new Error(`Early exit: ${contextState.restrictionReason}`);
  }
}

// Only proceed with initialization if we're in a safe context
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
 * Validates the availability and integrity of the chrome.runtime API
 * @returns {Object} Validation results indicating API availability status
 */
const validateRuntimeAPI = () => {
  const result = {
    available: false,
    chromeExists: false,
    runtimeExists: false,
    sendMessageExists: false,
    runtimeAccessible: false,
    lastErrorAccessible: false,
    details: {},
    fallbackReason: null
  };
  
  try {
    // Check if Chrome is defined
    result.chromeExists = typeof chrome !== 'undefined';
    
    // If Chrome exists, check runtime
    if (result.chromeExists) {
      result.runtimeExists = typeof chrome.runtime !== 'undefined';
      
      // If runtime exists, check sendMessage
      if (result.runtimeExists) {
        result.sendMessageExists = typeof chrome.runtime.sendMessage === 'function';
        
        // Check if lastError is accessible
        try {
          // Just accessing lastError should not throw if the runtime API works correctly
          const lastErrorExists = 'lastError' in chrome.runtime;
          result.lastErrorAccessible = lastErrorExists;
        } catch (lastErrorError) {
          result.details.lastErrorError = lastErrorError.message;
          result.lastErrorAccessible = false;
        }
        
        // Verify extension context by trying to actually use the runtime API
        try {
          // Getting extension ID will throw in some restricted contexts
          const extensionId = chrome.runtime.id;
          // Getting a URL shouldn't throw in most contexts if the runtime API is usable
          const url = chrome.runtime.getURL('');
          result.runtimeAccessible = true;
          result.details.extensionId = extensionId;
        } catch (runtimeError) {
          result.details.runtimeError = runtimeError.message;
          result.runtimeAccessible = false;
          result.fallbackReason = 'runtime_access_denied';
        }
      } else {
        result.fallbackReason = 'runtime_missing';
      }
    } else {
      result.fallbackReason = 'chrome_missing';
    }
    
    // Determine overall availability based on all checks
    result.available = result.chromeExists && 
                       result.runtimeExists && 
                       result.sendMessageExists && 
                       result.runtimeAccessible;
    
    return result;
  } catch (error) {
    // If validation itself fails, the API is definitely not working
    return {
      available: false,
      error: error.message,
      fallbackReason: 'validation_error'
    };
  }
};

/**
 * Function to request Bitcoin price from the service worker
 * Enhanced with comprehensive error handling
 * @returns {Promise<Object>} - Bitcoin price data
 */
const getBitcoinPrice = async () => {
  // Validate the runtime API before using it
  const runtimeValidation = validateRuntimeAPI();
  
  // Log the validation results for debugging
  console.debug('Bitcoin Price Tag: Runtime API validation', runtimeValidation);
  
  // If runtime API is not available, use fallbacks
  if (!runtimeValidation.available) {
    const error = createError(
      `Chrome runtime API not available: ${runtimeValidation.fallbackReason || 'unknown reason'}`,
      ErrorTypes.RUNTIME,
      { 
        browserName: browserInfo.name,
        validation: runtimeValidation
      }
    );
    logError(error, {
      severity: ErrorSeverity.ERROR,
      context: 'runtime_api_validation'
    });
    
    // Check if bridge is available as an alternative approach
    const hasBridge = typeof window !== 'undefined' && 
                    window.bitcoinPriceTagBridge && 
                    typeof window.bitcoinPriceTagBridge.sendMessageToBackground === 'function';
    
    if (hasBridge) {
      console.debug('Bitcoin Price Tag: Using messaging bridge as runtime API fallback');
      try {
        // Create a promise that will be resolved with the bridge response
        return await new Promise((resolve, reject) => {
          window.bitcoinPriceTagBridge.sendMessageToBackground(
            { action: 'getBitcoinPrice' },
            (response) => {
              if (!response) {
                reject(new Error('No response from bridge'));
                return;
              }
              resolve(response);
            }
          );
        });
      } catch (bridgeError) {
        console.debug('Bitcoin Price Tag: Bridge fallback failed', bridgeError.message);
        // Continue to other fallbacks if bridge fails
      }
    }
    
    // Try to get local cache as fallback
    const localCache = await getLocalCachedPriceData();
    if (localCache) {
      return {
        ...localCache,
        apiValidation: {
          available: false,
          reason: runtimeValidation.fallbackReason
        }
      };
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
    return {
      ...createEmergencyPriceData(),
      apiValidation: {
        available: false,
        reason: runtimeValidation.fallbackReason
      }
    };
  }
  
  try {
    // Check runtime API one more time just before sending the message
    // This catches cases where the API becomes unavailable after our initial validation
    if (runtimeValidation.runtimeAccessible && runtimeValidation.sendMessageExists) {
      try {
        // Try to use the runtime API once more to ensure it's actually working
        const testUrl = chrome.runtime.getURL('');
      } catch (lastMinuteError) {
        // API became unavailable, try bridge instead
        throw createError(
          'Runtime API became unavailable before message send',
          ErrorTypes.RUNTIME,
          { lastMinuteError, validation: runtimeValidation }
        );
      }
    }
    
    // Check if bridge might be a better option if runtime is partially available
    // This handles edge cases where runtime exists but might be degraded
    const hasBridge = typeof window !== 'undefined' && 
                    window.bitcoinPriceTagBridge && 
                    typeof window.bitcoinPriceTagBridge.sendMessageToBackground === 'function' &&
                    typeof window.bitcoinPriceTagBridge.checkBridgeHealth === 'function';
                    
    // If we have a bridge with health check, evaluate if we should use it instead
    let useBridgeInstead = false;
    let bridgeHealth = null;
    
    if (hasBridge) {
      try {
        bridgeHealth = window.bitcoinPriceTagBridge.checkBridgeHealth();
        
        // Use bridge if one of these conditions is true:
        // 1. Runtime is partially available but not fully accessible
        // 2. lastError is not accessible which indicates potential issues
        // 3. Bridge is fully available and healthy
        useBridgeInstead = (
          (runtimeValidation.available && !runtimeValidation.lastErrorAccessible) ||
          (!runtimeValidation.runtimeAccessible && runtimeValidation.sendMessageExists) ||
          (bridgeHealth && bridgeHealth.available && runtimeValidation.fallbackReason)
        );
        
        if (useBridgeInstead) {
          console.debug('Bitcoin Price Tag: Using bridge instead of direct runtime', {
            reason: 'runtime_degraded',
            bridgeHealth
          });
          
          // Create a promise that will be resolved with the bridge response
          return await withTimeout(
            new Promise((resolve, reject) => {
              window.bitcoinPriceTagBridge.sendMessageToBackground(
                { action: 'getBitcoinPrice' },
                (response) => {
                  if (!response) {
                    reject(createError('No response from bridge', ErrorTypes.BRIDGE));
                    return;
                  }
                  
                  // Add validation context to response
                  const enhancedResponse = {
                    ...response,
                    messageMethod: 'bridge_fallback',
                    runtimeValidation: {
                      available: runtimeValidation.available,
                      reason: runtimeValidation.fallbackReason
                    }
                  };
                  
                  // Cache the response locally if it has price data
                  if (response.btcPrice) {
                    storeLocalCache(enhancedResponse);
                  }
                  
                  resolve(enhancedResponse);
                }
              );
            }),
            12000, // Slightly longer timeout for bridge approach
            'Bridge Bitcoin price request timed out'
          );
        }
      } catch (healthError) {
        // Continue with normal runtime if bridge health check fails
        console.debug('Bitcoin Price Tag: Bridge health check failed, using runtime', 
                       healthError.message);
      }
    }
    
    // Determine if we should use a slower timeout for degraded API
    const timeoutDuration = runtimeValidation.fallbackReason ? 15000 : 10000;
    
    // Use withTimeout for automatic timeout handling
    return await withTimeout(
      new Promise((resolve, reject) => {
        try {
          // Final type check before invocation to be extra safe
          if (typeof chrome.runtime.sendMessage !== 'function') {
            throw createError(
              'chrome.runtime.sendMessage is not a function',
              ErrorTypes.RUNTIME,
              { validation: runtimeValidation }
            );
          }
          
          // Use safeChromeCallback to handle chrome.runtime.lastError and other error cases
          chrome.runtime.sendMessage(
            { action: 'getBitcoinPrice' }, 
            safeChromeCallback(
              function(response) {
                // If no response received
                if (!response) {
                  reject(createError(
                    'No response from service worker', 
                    ErrorTypes.RUNTIME,
                    { validation: runtimeValidation }
                  ));
                  return;
                }
                
                // Add validation context to response
                const enhancedResponse = {
                  ...response,
                  messageMethod: 'direct_runtime',
                  runtimeValidation: {
                    available: runtimeValidation.available,
                    status: runtimeValidation.fallbackReason ? 'degraded' : 'healthy'
                  }
                };
                
                // If the response has an error status, handle appropriately
                if (response.status === 'error') {
                  // This means background script had an error but still returned data
                  // We can use the data but should log the error
                  logError(
                    createError(
                      `Service worker reported error: ${response.error ? response.error.message : 'Unknown error'}`,
                      response.error ? response.error.type : ErrorTypes.UNKNOWN,
                      {
                        ...response.error,
                        validation: runtimeValidation
                      }
                    ),
                    {
                      severity: ErrorSeverity.WARNING,
                      context: 'background_reported_error'
                    }
                  );
                  
                  // If we have cached data in the response, use it
                  if (response.btcPrice) {
                    // Also cache locally
                    storeLocalCache(enhancedResponse);
                    resolve(enhancedResponse);
                    return;
                  }
                  
                  // Check for bridge fallback
                  if (hasBridge && bridgeHealth && bridgeHealth.available) {
                    console.debug('Bitcoin Price Tag: Service worker error, trying bridge fallback');
                    try {
                      // Create a promise that will be resolved with the bridge response
                      return new Promise((innerResolve, innerReject) => {
                        window.bitcoinPriceTagBridge.sendMessageToBackground(
                          { action: 'getBitcoinPrice' },
                          (bridgeResponse) => {
                            if (!bridgeResponse) {
                              innerReject(new Error('No response from bridge'));
                              return;
                            }
                            innerResolve(bridgeResponse);
                          }
                        );
                      });
                      
                      if (bridgeResponse && bridgeResponse.btcPrice) {
                        // Also cache locally
                        const bridgeEnhanced = {
                          ...bridgeResponse,
                          messageMethod: 'bridge_after_runtime_error',
                          runtimeValidation: {
                            available: runtimeValidation.available,
                            status: 'error_fallback'
                          }
                        };
                        storeLocalCache(bridgeEnhanced);
                        resolve(bridgeEnhanced);
                        return;
                      }
                    } catch (bridgeFallbackError) {
                      // Continue with rejection if bridge also fails
                      console.debug('Bitcoin Price Tag: Bridge fallback also failed', 
                                     bridgeFallbackError.message);
                    }
                  }
                  
                  reject(createError(
                    'Service worker error',
                    ErrorTypes.RUNTIME,
                    {
                      ...response.error,
                      validation: runtimeValidation
                    }
                  ));
                  return;
                }
                
                // Success case
                // Cache successfully retrieved data locally
                storeLocalCache(enhancedResponse);
                resolve(enhancedResponse);
              },
              {
                context: 'getBitcoinPrice',
                fallback: () => {
                  // If the callback fails, handle this as a rejection
                  reject(createError(
                    'Chrome messaging callback failed',
                    ErrorTypes.CALLBACK,
                    { 
                      action: 'getBitcoinPrice',
                      validation: runtimeValidation
                    }
                  ));
                }
              }
            )
          );
        } catch (error) {
          // If runtime API fails, try bridge as fallback if available
          if (hasBridge && bridgeHealth && bridgeHealth.available) {
            console.debug('Bitcoin Price Tag: Runtime API failed, trying bridge fallback');
            try {
              window.bitcoinPriceTagBridge.sendMessageToBackground(
                { action: 'getBitcoinPrice' },
                (response) => {
                  if (!response) {
                    reject(createError('No response from bridge fallback', ErrorTypes.BRIDGE));
                    return;
                  }
                  
                  // Add validation context to response
                  const enhancedResponse = {
                    ...response,
                    messageMethod: 'bridge_after_runtime_exception',
                    runtimeValidation: {
                      available: false,
                      error: error.message
                    }
                  };
                  
                  // Cache the response locally if it has price data
                  if (response.btcPrice) {
                    storeLocalCache(enhancedResponse);
                  }
                  
                  resolve(enhancedResponse);
                }
              );
              
              // Don't reject here - let the bridge handle the response
              return;
            } catch (bridgeError) {
              // Continue with rejection if bridge also fails
              console.debug('Bitcoin Price Tag: Bridge fallback also failed after runtime exception', 
                           bridgeError.message);
            }
          }
          
          reject(createError(
            `Exception sending message: ${error.message}`,
            ErrorTypes.RUNTIME,
            { 
              originalError: error,
              validation: runtimeValidation
            }
          ));
        }
      }),
      timeoutDuration,
      'Bitcoin price request timed out'
    );
  } catch (error) {
    // Handle all errors from the service worker request
    logError(error, {
      severity: ErrorSeverity.ERROR,
      context: 'service_worker_request',
      runtimeValidation: runtimeValidation
    });
    
    // Try bridge as fallback if we didn't already try it above
    // This covers cases where error occurred in the main try block
    const hasBridge = typeof window !== 'undefined' && 
                    window.bitcoinPriceTagBridge && 
                    typeof window.bitcoinPriceTagBridge.sendMessageToBackground === 'function';
    
    if (hasBridge && !error.message.includes('bridge')) {
      console.debug('Bitcoin Price Tag: Trying bridge as final fallback after runtime errors');
      try {
        // Create a promise that will be resolved with the bridge response
        const bridgeResponse = await new Promise((resolve, reject) => {
          window.bitcoinPriceTagBridge.sendMessageToBackground(
            { action: 'getBitcoinPrice' },
            (response) => {
              if (!response) {
                reject(new Error('No response from bridge'));
                return;
              }
              resolve(response);
            }
          );
        });
        
        if (bridgeResponse && bridgeResponse.btcPrice) {
          // Add context to the response
          const enhancedResponse = {
            ...bridgeResponse,
            messageMethod: 'bridge_final_fallback',
            runtimeValidation: {
              available: false,
              error: error.message
            }
          };
          
          // Cache the response
          await storeLocalCache(enhancedResponse);
          
          return enhancedResponse;
        }
      } catch (bridgeError) {
        console.debug('Bitcoin Price Tag: Final bridge fallback also failed', bridgeError.message);
        // Continue to other fallbacks
      }
    }
    
    // Try to get fallback data from bridge if available
    if (hasBridge && typeof window.bitcoinPriceTagBridge.getFallbackPriceData === 'function') {
      try {
        const fallbackData = window.bitcoinPriceTagBridge.getFallbackPriceData();
        if (fallbackData && fallbackData.btcPrice) {
          console.debug('Bitcoin Price Tag: Using bridge fallback data');
          return {
            ...fallbackData,
            messageMethod: 'bridge_fallback_data',
            warning: 'Using bridge fallback data due to errors',
            error: {
              message: error.message,
              type: error.type || categorizeError(error)
            }
          };
        }
      } catch (fallbackError) {
        console.debug('Bitcoin Price Tag: Error getting bridge fallback data', fallbackError.message);
      }
    }
    
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
        },
        runtimeValidation: {
          available: runtimeValidation.available,
          reason: runtimeValidation.fallbackReason || 'runtime_error'
        }
      };
    }
    
    // Last resort emergency fallback
    return {
      ...createEmergencyPriceData(),
      error: {
        message: error.message,
        type: error.type || categorizeError(error)
      },
      runtimeValidation: {
        available: runtimeValidation.available,
        reason: runtimeValidation.fallbackReason || 'runtime_error'
      }
    };
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
    // Check context again before performing DOM operations
    // This ensures we don't try to process DOM in a restricted context
    const contextState = checkExecutionContext();
    if (contextState.isRestricted) {
      // Use structured logging for the process-time early exit
      logContextDetection(contextState, 'content_process', true);
      return; // Exit without processing
    }
    
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
    chrome.runtime.sendMessage(
      refreshMessage, 
      safeChromeCallback(
        (response) => {
          if (response && response.status === 'success') {
            console.debug('Bitcoin Price Tag: Background refresh successful');
          }
        },
        {
          context: 'backgroundRefresh',
          silent: true // No need to log errors for this non-critical operation
        }
      )
    );
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
    // Perform a secondary context check before initialization
    // This catches any issues that might have arisen since the initial check
    const contextState = checkExecutionContext();
    
    // If context is now restricted, exit early before any API/DOM operations
    if (contextState.isRestricted) {
      // Use structured logging for the init early exit
      logContextDetection(contextState, 'content_init', true);
      return; // Exit without initializing
    }
    
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

// Export the API (either real implementation or empty if we exited early)
export const bitcoinPriceTagApi = window._emptyBitcoinPriceTagApi || {
  convert,
  walk,
  getBitcoinPrice,
  processPage
};
