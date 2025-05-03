import { calculateSatPrice } from './conversion.js';
import { 
  ErrorTypes, 
  ErrorSeverity, 
  logError, 
  categorizeError,
  createError, 
  withTimeout, 
  withRetry 
} from './error-handling.js';
import {
  CACHE_KEYS,
  CACHE_FRESHNESS,
  CACHE_TTL,
  cachePriceData,
  getCachedPriceData as getMultiSourceCachedData,
  shouldRefreshCache,
  calculatePriceVolatility,
  calculateCacheTTL,
  determineCacheFreshness,
  isOffline
} from './cache-manager.js';
import {
  debounce,
  throttle,
  coalesce
} from './debounce.js';

// Constants - using new cache manager constants
const PRICE_STORAGE_KEY = CACHE_KEYS.CHROME_STORAGE;
const PRICE_ERROR_KEY = CACHE_KEYS.CACHE_ERROR;
const PRICE_FETCH_INTERVAL = CACHE_TTL.FRESH; // 5 minutes in milliseconds
const PRICE_FETCH_TIMEOUT = 10000; // 10 seconds timeout for API requests
const MAX_CACHE_AGE = CACHE_TTL.VERY_STALE; // 24 hours maximum cache age
const COINDESK_API_URL = 'https://api.coindesk.com/v1/bpi/currentprice/USD.json';
const ALTERNATIVE_API_URLS = [
  'https://blockchain.info/ticker', // Alternative API 1
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd' // Alternative API 2
];

/**
 * Fetches Bitcoin price data from CoinDesk API with enhanced error handling
 * @returns {Promise<Object>} Price data object
 */
async function fetchBitcoinPrice() {
  // Use withRetry for automatic retry with backoff
  return withRetry(
    async () => {
      // Use withTimeout to ensure request doesn't hang
      const response = await withTimeout(
        fetch(COINDESK_API_URL), 
        PRICE_FETCH_TIMEOUT,
        'Bitcoin price API request timed out'
      );
      
      if (!response.ok) {
        const error = createError(
          `API responded with status: ${response.status}`,
          ErrorTypes.API,
          { statusCode: response.status }
        );
        throw error;
      }
      
      try {
        const data = await response.json();
        
        // Validate data structure
        if (!data || !data.bpi || !data.bpi.USD || !data.bpi.USD.rate) {
          throw createError(
            'Invalid API response format',
            ErrorTypes.PARSING,
            { data }
          );
        }
        
        // Extract price data
        const btcPrice = parseFloat(data.bpi.USD.rate.replace(',', ''));
        
        // Validate price data
        if (isNaN(btcPrice) || btcPrice <= 0) {
          throw createError(
            'Invalid price value from API',
            ErrorTypes.PARSING,
            { receivedValue: data.bpi.USD.rate }
          );
        }
        
        const satPrice = calculateSatPrice(btcPrice);
        
        // Create price data object with success info
        return {
          btcPrice,
          satPrice,
          timestamp: Date.now(),
          source: 'coindesk',
          success: true
        };
      } catch (error) {
        // Handle JSON parsing errors
        if (error.type !== ErrorTypes.PARSING) {
          error.type = ErrorTypes.PARSING;
        }
        throw error;
      }
    },
    {
      retries: 3,
      initialBackoff: 1000,
      shouldRetry: (error) => {
        // Don't retry parsing errors
        return error.type !== ErrorTypes.PARSING;
      }
    }
  );
}

/**
 * Attempts to fetch Bitcoin price from alternative APIs if primary fails
 * @returns {Promise<Object>} Price data object
 */
async function fetchFromAlternativeApis() {
  // Try alternative APIs in sequence
  for (const apiUrl of ALTERNATIVE_API_URLS) {
    try {
      const response = await withTimeout(
        fetch(apiUrl),
        PRICE_FETCH_TIMEOUT,
        'Alternative API request timed out'
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      let btcPrice = null;
      
      // Different APIs have different response formats
      if (apiUrl.includes('blockchain.info')) {
        btcPrice = data.USD?.last;
      } else if (apiUrl.includes('coingecko')) {
        btcPrice = data.bitcoin?.usd;
      }
      
      if (btcPrice && !isNaN(btcPrice) && btcPrice > 0) {
        const satPrice = calculateSatPrice(btcPrice);
        return {
          btcPrice,
          satPrice,
          timestamp: Date.now(),
          source: apiUrl.includes('blockchain') ? 'blockchain' : 'coingecko',
          success: true
        };
      }
    } catch (error) {
      // Just log and continue to next API
      logError(error, {
        severity: ErrorSeverity.WARNING,
        context: 'alternative_api',
        url: apiUrl
      });
    }
  }
  
  // If all alternative APIs fail, throw error
  throw createError(
    'All alternative APIs failed',
    ErrorTypes.API,
    { apiUrls: ALTERNATIVE_API_URLS }
  );
}

/**
 * Get cached price data from all available caches
 * This function is now a wrapper around the cache-manager's getMultiSourceCachedData
 * @returns {Promise<Object|null>} Cached price data or null
 */
async function getCachedPriceData() {
  try {
    // Use the new cache manager to get cached data from all sources
    const cachedData = await getMultiSourceCachedData();
    
    if (cachedData) {
      return {
        ...cachedData,
        cached: true,
        cacheAge: Date.now() - cachedData.timestamp
      };
    }
    
    return null;
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.WARNING,
      context: 'cache_retrieval'
    });
    return null;
  }
}

/**
 * Store error information in local storage
 * @param {Error} error - The error that occurred
 */
async function storeErrorInfo(error) {
  try {
    const errorInfo = {
      message: error.message,
      type: error.type || 'unknown',
      timestamp: Date.now(),
      details: error.details || {}
    };
    
    await chrome.storage.local.set({ [PRICE_ERROR_KEY]: errorInfo });
  } catch (storageError) {
    // Just log, don't throw
    logError(storageError, {
      severity: ErrorSeverity.WARNING,
      context: 'error_storage'
    });
  }
}

/**
 * Main function to fetch and store Bitcoin price with comprehensive error handling
 * This is the raw implementation without debouncing
 * @returns {Promise<Object>} Price data object
 */
async function _rawFetchAndStoreBitcoinPrice() {
  let priceData = null;
  let fetchFailed = false;
  
  try {
    // Try primary API first
    priceData = await fetchBitcoinPrice();
    
    // Clear any stored errors since we succeeded
    await chrome.storage.local.remove(PRICE_ERROR_KEY);
  } catch (primaryError) {
    fetchFailed = true;
    logError(primaryError, {
      severity: ErrorSeverity.ERROR,
      context: 'primary_api_fetch'
    });
    
    try {
      // Try alternative APIs
      priceData = await fetchFromAlternativeApis();
      
      // Log that we used a fallback
      console.warn('Using alternative API for Bitcoin price data', {
        source: priceData.source
      });
    } catch (alternativeError) {
      logError(alternativeError, {
        severity: ErrorSeverity.ERROR,
        context: 'alternative_api_fetch'
      });
      
      // Store the error info for tracking
      await storeErrorInfo(alternativeError);
      
      // Get cached data as last resort
      priceData = await getCachedPriceData();
      
      if (!priceData) {
        // If we have no cached data, create a minimal emergency response
        throw createError(
          'Failed to get Bitcoin price data from all sources and no cache available',
          ErrorTypes.API,
          { primaryError, alternativeError }
        );
      }
    }
  }
  
  try {
    // Store data in all available caches using the cache manager
    // The cache manager handles checking timestamps and not overwriting newer data
    await cachePriceData(priceData);
    
    // If we have previous data, calculate volatility and update metadata
    const existingData = await getCachedPriceData();
    if (existingData && existingData.timestamp !== priceData.timestamp) {
      const volatility = calculatePriceVolatility(priceData, existingData);
      const ttl = calculateCacheTTL(volatility);
      
      // Log volatility for debugging
      console.debug('Bitcoin price volatility:', {
        volatility,
        calculatedTTL: ttl,
        oldPrice: existingData.btcPrice,
        newPrice: priceData.btcPrice,
        percentChange: ((priceData.btcPrice - existingData.btcPrice) / existingData.btcPrice * 100).toFixed(2) + '%'
      });
    }
  } catch (storageError) {
    logError(storageError, {
      severity: ErrorSeverity.WARNING,
      context: 'price_storage'
    });
  }
  
  return {
    ...priceData,
    fetchFailed: fetchFailed
  };
}

/**
 * Tracking for fetch requests to implement backoff after failures
 */
const fetchTracker = {
  lastFailure: 0,
  consecutiveFailures: 0,
  backoffTime: 1000, // Start with 1 second
  
  recordSuccess() {
    this.consecutiveFailures = 0;
    this.backoffTime = 1000;
  },
  
  recordFailure() {
    this.lastFailure = Date.now();
    this.consecutiveFailures++;
    // Exponential backoff capped at 5 minutes
    this.backoffTime = Math.min(
      this.backoffTime * 2,
      5 * 60 * 1000
    );
  },
  
  shouldBackoff() {
    if (this.consecutiveFailures === 0) return false;
    
    const timeSinceLastFailure = Date.now() - this.lastFailure;
    return timeSinceLastFailure < this.backoffTime;
  },
  
  getBackoffDelay() {
    const timeSinceLastFailure = Date.now() - this.lastFailure;
    return Math.max(0, this.backoffTime - timeSinceLastFailure);
  }
};

/**
 * Request queue for price updates
 * This implements a queue system to track all pending price requests
 */
const priceRequestQueue = {
  pendingRequests: new Map(),
  currentRequest: null,
  
  // Add a request to the queue
  addRequest(requestId, priority = 1) {
    this.pendingRequests.set(requestId, {
      id: requestId,
      priority,
      timestamp: Date.now()
    });
    
    this.processNextRequest();
  },
  
  // Process the next request in the queue
  async processNextRequest() {
    if (this.currentRequest) return; // Already processing
    
    // Get the highest priority request
    const nextRequest = this.getHighestPriorityRequest();
    if (!nextRequest) return; // No requests
    
    this.currentRequest = nextRequest;
    this.pendingRequests.delete(nextRequest.id);
    
    try {
      // Check if we should apply backoff after failures
      if (fetchTracker.shouldBackoff()) {
        console.debug('Applying backoff delay:', fetchTracker.getBackoffDelay());
        await new Promise(resolve => setTimeout(resolve, fetchTracker.getBackoffDelay()));
      }
      
      // Process the request
      const result = await _rawFetchAndStoreBitcoinPrice();
      fetchTracker.recordSuccess();
      return result;
    } catch (error) {
      fetchTracker.recordFailure();
      throw error;
    } finally {
      this.currentRequest = null;
      // Process any remaining requests
      if (this.pendingRequests.size > 0) {
        this.processNextRequest();
      }
    }
  },
  
  // Get the highest priority request
  getHighestPriorityRequest() {
    if (this.pendingRequests.size === 0) return null;
    
    // Sort by priority (desc) then timestamp (asc)
    return Array.from(this.pendingRequests.values())
      .sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      })[0];
  }
};

/**
 * Debounced version of fetchAndStoreBitcoinPrice
 * Only allows one request every 2 seconds, and coalesces similar requests
 */
const debouncedFetchPrice = debounce(() => {
  // Use a unique ID for each request
  const requestId = `price_${Date.now()}`;
  priceRequestQueue.addRequest(requestId, 1);
  
  // Return a promise that resolves when the data is fetched
  return priceRequestQueue.processNextRequest();
}, 2000, { leading: true });

/**
 * High-priority version for user-initiated requests
 * This has higher priority but still enforces minimum time between requests
 */
const throttledFetchPrice = throttle(() => {
  const requestId = `user_${Date.now()}`;
  priceRequestQueue.addRequest(requestId, 10); // Higher priority
  
  return priceRequestQueue.processNextRequest();
}, 1000, { leading: true });

/**
 * Coalesced request handler for concurrent tab requests
 * This ensures that multiple tabs requesting at the same time only trigger one fetch
 */
const coalescedFetchPrice = coalesce(() => {
  return debouncedFetchPrice();
}, () => 'price', 50);

/**
 * Main function to fetch and store Bitcoin price with debouncing and coalescing
 * @param {boolean} [highPriority=false] - Whether this is a high-priority (user-initiated) request
 * @returns {Promise<Object>} Price data object
 */
async function fetchAndStoreBitcoinPrice(highPriority = false) {
  try {
    // Check if offline
    if (isOffline()) {
      console.debug('Device is offline, using cached data');
      const cachedData = await getCachedPriceData();
      if (cachedData) {
        return {
          ...cachedData,
          fromCache: true,
          offlineMode: true
        };
      }
      throw createError('Device is offline and no cached data available', ErrorTypes.NETWORK);
    }
    
    // Use appropriate fetch function based on priority
    if (highPriority) {
      return await throttledFetchPrice();
    } else {
      return await coalescedFetchPrice();
    }
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.ERROR,
      context: 'debounced_fetch'
    });
    
    // Fall back to cache if fetch fails
    const cachedData = await getCachedPriceData();
    if (cachedData) {
      return {
        ...cachedData,
        fromCache: true,
        fetchFailed: true
      };
    }
    
    // Re-throw if no cached data
    throw error;
  }
}

/**
 * Initialize the extension by fetching Bitcoin price
 */
async function initialize() {
  try {
    // Try to get price data on startup
    await fetchAndStoreBitcoinPrice();
    console.log('Bitcoin Price Tag initialized successfully');
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.ERROR,
      context: 'initialization'
    });
    console.error('Failed to initialize Bitcoin Price Tag');
  }
  
  // Set up alarm for periodic updates regardless of initialization success
  setupPeriodicUpdates();
}

/**
 * Setup periodic price updates using chrome.alarms
 */
function setupPeriodicUpdates() {
  try {
    // Set up alarm for periodic price updates
    chrome.alarms.create('updateBitcoinPrice', {
      periodInMinutes: PRICE_FETCH_INTERVAL / (60 * 1000)
    });
    
    // Handle alarm events
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'updateBitcoinPrice') {
        // Don't await, let it run in the background
        fetchAndStoreBitcoinPrice().catch(error => {
          logError(error, {
            severity: ErrorSeverity.ERROR,
            context: 'alarm_triggered_update'
          });
        });
      }
    });
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.ERROR,
      context: 'alarm_setup'
    });
  }
}

/**
 * Get price data for content scripts
 * This handles error states and caching
 * @param {Function} sendResponse - Chrome message API response function
 */
async function handleGetPriceData(sendResponse) {
  try {
    // Check offline status first
    const offline = isOffline();
    
    // First check if we have any cached data
    const cachedData = await getCachedPriceData();
    
    // Determine if and how we should refresh based on cache freshness
    const refreshInfo = shouldRefreshCache(cachedData);
    
    // If we're offline, always use cache regardless of freshness
    if (offline) {
      if (cachedData) {
        sendResponse({
          ...cachedData,
          fromCache: true,
          offlineMode: true,
          status: 'success',
          cacheAge: Date.now() - cachedData.timestamp,
          freshness: determineCacheFreshness(cachedData.timestamp)
        });
        return;
      } else {
        // No cache and offline - we're out of luck
        sendResponse({
          status: 'error',
          offlineMode: true,
          error: {
            message: 'No cached Bitcoin price data available and device is offline',
            type: ErrorTypes.NETWORK
          }
        });
        return;
      }
    }
    
    // If cache is fresh, use it
    if (!refreshInfo.shouldRefresh && cachedData) {
      sendResponse({
        ...cachedData,
        fromCache: true,
        status: 'success',
        freshness: determineCacheFreshness(cachedData.timestamp)
      });
      
      return;
    }
    
    // If we should refresh in the background (stale but usable cache),
    // first send the cached data, then refresh
    if (refreshInfo.shouldRefresh && !refreshInfo.immediately && cachedData) {
      // Send cached data immediately
      sendResponse({
        ...cachedData,
        fromCache: true,
        status: 'success',
        refreshing: true,
        freshness: determineCacheFreshness(cachedData.timestamp)
      });
      
      // Then trigger a background refresh without blocking
      fetchAndStoreBitcoinPrice().catch(error => {
        logError(error, {
          severity: ErrorSeverity.ERROR,
          context: 'background_refresh'
        });
      });
      
      return;
    }
    
    // If we need to fetch new data (no cache or cache too old)
    const freshData = await fetchAndStoreBitcoinPrice();
    sendResponse({
      ...freshData,
      status: 'success',
      freshness: CACHE_FRESHNESS.FRESH
    });
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.ERROR,
      context: 'price_data_request'
    });
    
    // Get any cached data, regardless of age as a last resort
    const lastResortCache = await getCachedPriceData();
    
    if (lastResortCache) {
      // Return stale cache with error info
      const freshness = determineCacheFreshness(lastResortCache.timestamp);
      sendResponse({
        ...lastResortCache,
        fromCache: true,
        cacheAge: Date.now() - lastResortCache.timestamp,
        staleCacheWarning: true,
        freshness: freshness,
        status: 'error',
        error: {
          message: error.message,
          type: error.type || categorizeError(error)
        }
      });
    } else {
      // No data available at all
      sendResponse({
        status: 'error',
        error: {
          message: 'No Bitcoin price data available',
          type: error.type || categorizeError(error)
        }
      });
    }
  }
}

/**
 * Check if error info is stored and get its details
 * @param {Function} sendResponse - Chrome message API response function
 */
async function handleGetErrorInfo(sendResponse) {
  try {
    const data = await chrome.storage.local.get(PRICE_ERROR_KEY);
    const errorInfo = data[PRICE_ERROR_KEY];
    
    sendResponse({
      status: 'success',
      hasError: !!errorInfo,
      errorInfo: errorInfo || null
    });
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.WARNING,
      context: 'error_info_request'
    });
    
    sendResponse({
      status: 'error',
      error: {
        message: 'Could not retrieve error information',
        type: categorizeError(error)
      }
    });
  }
}

// Initialize extension
initialize();

/**
 * Handle request for cache status information
 * @param {Function} sendResponse - Chrome message API response function
 */
async function handleGetCacheStatus(sendResponse) {
  try {
    // Get cache status report from the cache manager
    const cacheStatus = await getCacheStatus();
    
    sendResponse({
      status: 'success',
      cacheStatus
    });
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.WARNING,
      context: 'cache_status_request'
    });
    
    sendResponse({
      status: 'error',
      error: {
        message: 'Failed to get cache status',
        type: categorizeError(error)
      }
    });
  }
}

/**
 * Handle request to clear all caches
 * @param {Function} sendResponse - Chrome message API response function
 */
async function handleClearCache(sendResponse) {
  try {
    await clearAllCaches();
    
    sendResponse({
      status: 'success',
      message: 'All caches cleared successfully'
    });
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.ERROR,
      context: 'clear_cache_request'
    });
    
    sendResponse({
      status: 'error',
      error: {
        message: 'Failed to clear caches',
        type: categorizeError(error)
      }
    });
  }
}

// Respond to content script messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle different message types
  if (message.action === 'getBitcoinPrice') {
    // Handle price data request
    handleGetPriceData(sendResponse);
    return true; // Indicates we will respond asynchronously
  } 
  else if (message.action === 'getErrorInfo') {
    // Handle error info request
    handleGetErrorInfo(sendResponse);
    return true; // Indicates we will respond asynchronously
  }
  else if (message.action === 'forceRefresh') {
    // Force a refresh of price data with high priority
    fetchAndStoreBitcoinPrice(true) // Use high priority for user-initiated refresh
      .then(data => sendResponse({ 
        status: 'success', 
        data,
        debounced: data.debounced // Indicate if the request was debounced
      }))
      .catch(error => {
        logError(error, {
          severity: ErrorSeverity.ERROR,
          context: 'forced_refresh'
        });
        sendResponse({
          status: 'error',
          error: {
            message: error.message,
            type: error.type || categorizeError(error)
          }
        });
      });
    return true; // Indicates we will respond asynchronously
  }
  else if (message.action === 'getCacheStatus') {
    // Get cache status information
    handleGetCacheStatus(sendResponse);
    return true;
  }
  else if (message.action === 'clearCache') {
    // Clear all caches
    handleClearCache(sendResponse);
    return true;
  }
});