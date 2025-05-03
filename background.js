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

// Constants
const PRICE_STORAGE_KEY = 'btcPriceData';
const PRICE_ERROR_KEY = 'btcPriceError';
const PRICE_FETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const PRICE_FETCH_TIMEOUT = 10000; // 10 seconds timeout for API requests
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours maximum cache age
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
 * Get cached price data from local storage
 * @returns {Promise<Object|null>} Cached price data or null
 */
async function getCachedPriceData() {
  try {
    const data = await chrome.storage.local.get(PRICE_STORAGE_KEY);
    const cachedData = data[PRICE_STORAGE_KEY];
    
    if (cachedData) {
      // Add cached flag
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
 * @returns {Promise<Object>} Price data object
 */
async function fetchAndStoreBitcoinPrice() {
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
    // Store data in local storage (even if it's from fallback or cache)
    // Don't overwrite newer data with older cached data
    const existingData = await getCachedPriceData();
    if (!existingData || priceData.timestamp >= existingData.timestamp) {
      await chrome.storage.local.set({ [PRICE_STORAGE_KEY]: priceData });
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
    // First check if we have fresh cached data
    const cachedData = await getCachedPriceData();
    
    if (cachedData && (Date.now() - cachedData.timestamp < PRICE_FETCH_INTERVAL)) {
      // Use fresh cache
      sendResponse({
        ...cachedData,
        fromCache: true,
        status: 'success'
      });
      return;
    }
    
    // Try to fetch new data
    const freshData = await fetchAndStoreBitcoinPrice();
    sendResponse({
      ...freshData,
      status: 'success'
    });
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.ERROR,
      context: 'price_data_request'
    });
    
    // Get any cached data, regardless of age
    const lastResortCache = await getCachedPriceData();
    
    if (lastResortCache) {
      // Return stale cache with error info
      sendResponse({
        ...lastResortCache,
        fromCache: true,
        cacheAge: Date.now() - lastResortCache.timestamp,
        staleCacheWarning: true,
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
    // Force a refresh of price data
    fetchAndStoreBitcoinPrice()
      .then(data => sendResponse({ status: 'success', data }))
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
});