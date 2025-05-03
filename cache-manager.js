/**
 * Cache Manager for Bitcoin Price Tag extension
 * Handles all caching operations for Bitcoin price data with multiple layers
 */

import { ErrorTypes, ErrorSeverity, logError, createError } from './error-handling.js';
import { detectBrowser } from './browser-detect.js';

// Constants for cache management
export const CACHE_KEYS = {
  CHROME_STORAGE: 'btcPriceData',
  LOCAL_STORAGE: 'btcPriceTagLocalCache',
  MEMORY_CACHE: 'memoryCache',
  CACHE_ERROR: 'btcPriceErrorCache',
  CACHE_METADATA: 'btcPriceMetadata'
};

export const CACHE_FRESHNESS = {
  FRESH: 'fresh',           // Use directly without refresh (< 5 min)
  STALE: 'stale',           // Use but refresh in background (5 min - 1 hour)
  VERY_STALE: 'very_stale', // Use but refresh immediately (1 hour - 24 hours)
  EXPIRED: 'expired'        // Do not use unless offline/error (> 24 hours)
};

export const CACHE_TTL = {
  FRESH: 5 * 60 * 1000,         // 5 minutes
  STALE: 60 * 60 * 1000,        // 1 hour 
  VERY_STALE: 24 * 60 * 60 * 1000 // 24 hours
};

// Version of cache structure for migration purposes
const CACHE_VERSION = '1.0.0';

// In-memory cache for fastest access
const memoryCache = new Map();

/**
 * Check browser storage availability
 * @returns {Object} Storage availability status
 */
export function checkStorageAvailability() {
  const browser = detectBrowser();
  const hasChrome = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  const hasLocalStorage = storageAvailable('localStorage');
  
  return {
    chrome: hasChrome,
    localStorage: hasLocalStorage,
    memory: true,
    indexedDB: false, // Reserved for future use
    browser: browser.name
  };
}

/**
 * Check if a specific storage type is available
 * @param {string} type - Storage type to check
 * @returns {boolean} Whether storage is available
 */
function storageAvailable(type) {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Create metadata for cache entry
 * @param {Object} options - Metadata options
 * @returns {Object} Cache metadata object
 */
function createCacheMetadata(options = {}) {
  const now = Date.now();
  return {
    version: CACHE_VERSION,
    created: options.created || now,
    expires: options.expires || now + CACHE_TTL.VERY_STALE,
    lastRefreshed: options.lastRefreshed || now,
    refreshCount: options.refreshCount || 0,
    volatility: options.volatility || 0
  };
}

/**
 * Determine cache freshness based on timestamp
 * @param {number} timestamp - Cache entry timestamp
 * @returns {string} Freshness level from CACHE_FRESHNESS enum
 */
export function determineCacheFreshness(timestamp) {
  if (!timestamp) return CACHE_FRESHNESS.EXPIRED;
  
  const age = Date.now() - timestamp;
  
  if (age < CACHE_TTL.FRESH) {
    return CACHE_FRESHNESS.FRESH;
  } else if (age < CACHE_TTL.STALE) {
    return CACHE_FRESHNESS.STALE;
  } else if (age < CACHE_TTL.VERY_STALE) {
    return CACHE_FRESHNESS.VERY_STALE;
  } else {
    return CACHE_FRESHNESS.EXPIRED;
  }
}

/**
 * Check if the device is currently offline
 * @returns {boolean} True if offline
 */
export function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Get cached price data from memory cache
 * @returns {Object|null} Cached data or null
 */
function getMemoryCache() {
  const cached = memoryCache.get(CACHE_KEYS.MEMORY_CACHE);
  if (!cached) return null;
  
  return {
    ...cached,
    fromMemoryCache: true,
    freshness: determineCacheFreshness(cached.timestamp)
  };
}

/**
 * Set memory cache data
 * @param {Object} data - The data to cache
 */
function setMemoryCache(data) {
  if (!data || !data.btcPrice) return;
  
  memoryCache.set(CACHE_KEYS.MEMORY_CACHE, {
    ...data,
    timestamp: data.timestamp || Date.now()
  });
}

/**
 * Get cached price data from chrome.storage.local
 * @returns {Promise<Object|null>} Cached data or null
 */
async function getChromeStorageCache() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return null;
  }
  
  try {
    const data = await chrome.storage.local.get([
      CACHE_KEYS.CHROME_STORAGE,
      CACHE_KEYS.CACHE_METADATA
    ]);
    
    const cachedData = data[CACHE_KEYS.CHROME_STORAGE];
    const metadata = data[CACHE_KEYS.CACHE_METADATA] || createCacheMetadata();
    
    if (!cachedData) return null;
    
    return {
      ...cachedData,
      metadata,
      fromChromeStorage: true,
      freshness: determineCacheFreshness(cachedData.timestamp)
    };
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.WARNING,
      context: 'chrome_storage_cache_retrieval'
    });
    return null;
  }
}

/**
 * Set chrome.storage.local cache data
 * @param {Object} data - The data to cache
 * @param {Object} metadata - Optional metadata to store with the cache
 * @returns {Promise<boolean>} Success status
 */
async function setChromeStorageCache(data, metadata = null) {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return false;
  }
  
  if (!data || !data.btcPrice) return false;
  
  try {
    // If metadata not provided, get existing or create new
    let metadataToStore = metadata;
    if (!metadataToStore) {
      const existingData = await chrome.storage.local.get(CACHE_KEYS.CACHE_METADATA);
      const existingMetadata = existingData[CACHE_KEYS.CACHE_METADATA];
      
      if (existingMetadata) {
        metadataToStore = {
          ...existingMetadata,
          lastRefreshed: Date.now(),
          refreshCount: existingMetadata.refreshCount + 1
        };
      } else {
        metadataToStore = createCacheMetadata();
      }
    }
    
    const timestamp = data.timestamp || Date.now();
    
    // Store both data and metadata
    await chrome.storage.local.set({
      [CACHE_KEYS.CHROME_STORAGE]: {
        ...data,
        timestamp
      },
      [CACHE_KEYS.CACHE_METADATA]: metadataToStore
    });
    
    return true;
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.WARNING,
      context: 'chrome_storage_cache_storage'
    });
    return false;
  }
}

/**
 * Get cached price data from localStorage
 * @returns {Object|null} Cached data or null
 */
function getLocalStorageCache() {
  if (!storageAvailable('localStorage')) {
    return null;
  }
  
  try {
    const cachedData = localStorage.getItem(CACHE_KEYS.LOCAL_STORAGE);
    if (!cachedData) return null;
    
    const parsed = JSON.parse(cachedData);
    return {
      ...parsed,
      fromLocalStorage: true,
      freshness: determineCacheFreshness(parsed.timestamp)
    };
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.WARNING,
      context: 'local_storage_cache_retrieval'
    });
    return null;
  }
}

/**
 * Set localStorage cache data
 * @param {Object} data - The data to cache
 * @returns {boolean} Success status
 */
function setLocalStorageCache(data) {
  if (!storageAvailable('localStorage')) {
    return false;
  }
  
  if (!data || !data.btcPrice) return false;
  
  try {
    localStorage.setItem(
      CACHE_KEYS.LOCAL_STORAGE,
      JSON.stringify({
        ...data,
        timestamp: data.timestamp || Date.now()
      })
    );
    return true;
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.WARNING,
      context: 'local_storage_cache_storage'
    });
    return false;
  }
}

/**
 * Get cached price data from all available sources
 * Returns the freshest available cache entry
 * @returns {Promise<Object|null>} Cached data or null
 */
export async function getCachedPriceData() {
  try {
    // Try memory cache first (fastest)
    const memoryData = getMemoryCache();
    if (memoryData && memoryData.freshness === CACHE_FRESHNESS.FRESH) {
      return memoryData;
    }
    
    // Try chrome.storage next
    const chromeData = await getChromeStorageCache();
    
    // Try localStorage
    const localData = getLocalStorageCache();
    
    // If we have no cache at all
    if (!memoryData && !chromeData && !localData) {
      return null;
    }
    
    // Determine which cache is freshest
    const caches = [memoryData, chromeData, localData].filter(Boolean);
    caches.sort((a, b) => {
      // First sort by freshness level
      const freshnessOrder = {
        [CACHE_FRESHNESS.FRESH]: 0,
        [CACHE_FRESHNESS.STALE]: 1,
        [CACHE_FRESHNESS.VERY_STALE]: 2,
        [CACHE_FRESHNESS.EXPIRED]: 3
      };
      
      if (freshnessOrder[a.freshness] !== freshnessOrder[b.freshness]) {
        return freshnessOrder[a.freshness] - freshnessOrder[b.freshness];
      }
      
      // Then by timestamp
      return b.timestamp - a.timestamp;
    });
    
    // Return the freshest cache
    return caches[0] || null;
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.ERROR,
      context: 'get_cached_price_data'
    });
    return null;
  }
}

/**
 * Store price data in all available caches
 * @param {Object} data - The price data to cache
 * @returns {Promise<boolean>} Success status
 */
export async function cachePriceData(data) {
  if (!data || !data.btcPrice) {
    return false;
  }
  
  try {
    // Ensure timestamp is set
    const timestamp = data.timestamp || Date.now();
    const dataToStore = {
      ...data,
      timestamp
    };
    
    // Set in all available caches
    const memorySuccess = setMemoryCache(dataToStore);
    const chromeSuccess = await setChromeStorageCache(dataToStore);
    const localSuccess = setLocalStorageCache(dataToStore);
    
    // Return true if at least one caching succeeded
    return memorySuccess || chromeSuccess || localSuccess;
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.ERROR,
      context: 'cache_price_data'
    });
    return false;
  }
}

/**
 * Check if a cache refresh is needed based on freshness
 * @param {Object} cachedData - The cached data to check
 * @returns {Object} Refresh information
 */
export function shouldRefreshCache(cachedData) {
  if (!cachedData) {
    return {
      shouldRefresh: true,
      immediately: true,
      reason: 'no_cache'
    };
  }
  
  const freshness = cachedData.freshness || 
    determineCacheFreshness(cachedData.timestamp);
  
  switch (freshness) {
    case CACHE_FRESHNESS.FRESH:
      return {
        shouldRefresh: false,
        immediately: false,
        reason: 'cache_fresh'
      };
    case CACHE_FRESHNESS.STALE:
      return {
        shouldRefresh: true,
        immediately: false,
        reason: 'cache_stale'
      };
    case CACHE_FRESHNESS.VERY_STALE:
      return {
        shouldRefresh: true,
        immediately: true,
        reason: 'cache_very_stale'
      };
    case CACHE_FRESHNESS.EXPIRED:
      return {
        shouldRefresh: true,
        immediately: true,
        reason: 'cache_expired'
      };
    default:
      return {
        shouldRefresh: true,
        immediately: true,
        reason: 'unknown_freshness'
      };
  }
}

/**
 * Calculate cache expiration based on volatility
 * @param {number} volatility - Price volatility measure (0-1)
 * @returns {number} TTL in milliseconds
 */
export function calculateCacheTTL(volatility = 0) {
  // Base TTL is 5 minutes
  const baseTTL = CACHE_TTL.FRESH;
  
  // With high volatility (1.0), TTL reduces to 1 minute
  // With low volatility (0.0), TTL extends to 10 minutes
  const volatilityFactor = Math.max(0, Math.min(1, volatility));
  const adjustedTTL = baseTTL * (2 - volatilityFactor);
  
  return Math.floor(adjustedTTL);
}

/**
 * Calculate price volatility based on recent price changes
 * @param {Object} newData - New price data
 * @param {Object} oldData - Previous price data
 * @returns {number} Volatility measure (0-1)
 */
export function calculatePriceVolatility(newData, oldData) {
  if (!newData || !oldData || !newData.btcPrice || !oldData.btcPrice) {
    return 0;
  }
  
  // Calculate percent change
  const percentChange = Math.abs(
    (newData.btcPrice - oldData.btcPrice) / oldData.btcPrice
  );
  
  // Time difference in hours
  const timeDiffHours = (newData.timestamp - oldData.timestamp) / (60 * 60 * 1000);
  
  if (timeDiffHours < 0.01) return 0; // Avoid division by zero
  
  // Hourly change rate (normalize to a 0-1 scale)
  const hourlyChange = Math.min(1, percentChange / timeDiffHours * 10);
  
  return hourlyChange;
}

/**
 * Clear all caches
 * @returns {Promise<boolean>} Success status
 */
export async function clearAllCaches() {
  try {
    // Clear memory cache
    memoryCache.delete(CACHE_KEYS.MEMORY_CACHE);
    
    // Clear chrome.storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.remove([
        CACHE_KEYS.CHROME_STORAGE,
        CACHE_KEYS.CACHE_METADATA,
        CACHE_KEYS.CACHE_ERROR
      ]);
    }
    
    // Clear localStorage
    if (storageAvailable('localStorage')) {
      localStorage.removeItem(CACHE_KEYS.LOCAL_STORAGE);
    }
    
    return true;
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.WARNING,
      context: 'clear_all_caches'
    });
    return false;
  }
}

/**
 * Create a complete cache status report
 * @returns {Promise<Object>} Cache status information
 */
export async function getCacheStatus() {
  try {
    const storageStatus = checkStorageAvailability();
    const cachedData = await getCachedPriceData();
    
    // Get chrome storage metadata
    let metadata = null;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get(CACHE_KEYS.CACHE_METADATA);
      metadata = data[CACHE_KEYS.CACHE_METADATA];
    }
    
    return {
      hasCachedData: !!cachedData,
      freshness: cachedData ? cachedData.freshness : null,
      cacheAge: cachedData ? Date.now() - cachedData.timestamp : null,
      storageAvailable: storageStatus,
      isOffline: isOffline(),
      metadata: metadata || null,
      lastUpdated: cachedData ? new Date(cachedData.timestamp).toISOString() : null,
      source: cachedData ? cachedData.source : null
    };
  } catch (error) {
    logError(error, {
      severity: ErrorSeverity.WARNING,
      context: 'get_cache_status'
    });
    
    return {
      hasCachedData: false,
      error: error.message,
      isOffline: isOffline()
    };
  }
}