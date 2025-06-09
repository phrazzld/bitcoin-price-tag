/**
 * Service worker cache module for persistent Bitcoin price data storage
 */

import { LocalStorageCache, PriceData } from '../common/types';
import { DEFAULT_CACHE_TTL_MS, PRICE_CACHE_KEY } from '../common/constants';
import {
  isObject,
  isValidTimestamp,
  hasOnlyExpectedProperties,
  hasRequiredProperties
} from '../common/validation-helpers';
import { createLogger } from '../shared/logger';

// Create logger instance for cache module
const logger = createLogger('service-worker-cache');

/** 
 * Current cache schema version - increment when structure changes
 * Used to detect incompatible cache formats for potential migrations
 */
const CACHE_VERSION = 1;

/** 
 * In-memory cache mirror for faster access
 * Avoids repeated reads from chrome.storage.local
 * Automatically rehydrated on service worker startup
 */
let memoryCache: LocalStorageCache | null = null;

/**
 * Cache-related error codes
 */
export enum CacheErrorCode {
  /** Error reading from storage */
  READ_ERROR = 'cache_read_error',
  /** Error writing to storage */
  WRITE_ERROR = 'cache_write_error',
  /** Invalid data structure in storage */
  INVALID_DATA = 'cache_invalid_data'
}

/**
 * Custom error class for cache-related errors
 */
export class CacheError extends Error {
  /** Error code from CacheErrorCode enum */
  readonly code: CacheErrorCode;

  constructor(message: string, code: CacheErrorCode) {
    super(message);
    this.name = 'CacheError';
    this.code = code;
  }
}

/**
 * Validates that the data has the expected cache structure
 * @param data The data to validate
 * @returns Whether the data is a valid LocalStorageCache
 */
/**
 * Type guard to check if value is valid PriceData
 */
function isValidPriceData(value: unknown): value is PriceData {
  if (!isObject(value)) return false;
  
  const requiredProps = ['usdRate', 'satoshiRate', 'fetchedAt', 'source'];
  if (!hasRequiredProperties(value, requiredProps)) return false;
  if (!hasOnlyExpectedProperties(value, requiredProps)) return false;
  
  return (
    typeof value.usdRate === 'number' && 
    Number.isFinite(value.usdRate) && 
    value.usdRate > 0 &&
    typeof value.satoshiRate === 'number' && 
    Number.isFinite(value.satoshiRate) && 
    value.satoshiRate > 0 &&
    isValidTimestamp(value.fetchedAt) &&
    typeof value.source === 'string' && 
    value.source.length > 0
  );
}

/**
 * Type guard to check if value is a valid cache version
 */
function isValidCacheVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

/**
 * Enhanced type guard to check if data is a valid LocalStorageCache
 * @internal Exported for testing only
 */
export function isValidCache(data: unknown): data is LocalStorageCache {
  if (!isObject(data)) return false;
  
  const requiredProps = ['priceData', 'cachedAt', 'version'];
  if (!hasRequiredProperties(data, requiredProps)) return false;
  if (!hasOnlyExpectedProperties(data, requiredProps)) return false;
  
  // Validate all properties with proper types
  if (!isValidPriceData(data.priceData)) return false;
  if (!isValidTimestamp(data.cachedAt)) return false;
  if (!isValidCacheVersion(data.version)) return false;
  
  // Check cache age - cache is invalid if too old
  const now = Date.now();
  const age = now - data.cachedAt;
  if (age < 0 || age >= DEFAULT_CACHE_TTL_MS) return false;
  
  return true;
}

/**
 * Checks if the cache has expired based on TTL
 * @param cache The cache to check
 * @param ttlMs Time-to-live in milliseconds
 * @returns Whether the cache has expired
 */
function isCacheExpired(cache: LocalStorageCache, ttlMs = DEFAULT_CACHE_TTL_MS): boolean {
  const now = Date.now();
  return now - cache.cachedAt > ttlMs;
}

/**
 * Rehydrates the in-memory cache from chrome.storage.local
 * This is useful after service worker restarts
 * @returns Promise that resolves when rehydration is complete
 */
export async function rehydrateCache(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(PRICE_CACHE_KEY);
    const cachedData: unknown = result[PRICE_CACHE_KEY];

    if (cachedData && isValidCache(cachedData)) {
      memoryCache = cachedData;
    }
  } catch (error) {
    logger.error('Failed to rehydrate cache', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    // Don't throw - rehydration failing shouldn't break the application
    // The code will fall back to API calls
  }
}

/**
 * Retrieves cached Bitcoin price data if it exists and is not expired
 * @param ttlMs Optional override for the cache TTL in milliseconds
 * @returns Promise resolving to cached PriceData if valid, or null if unavailable/expired
 * @throws CacheError if there's an error accessing storage
 */
export async function getCachedPrice(ttlMs = DEFAULT_CACHE_TTL_MS): Promise<PriceData | null> {
  // First try the in-memory cache for better performance
  if (memoryCache && !isCacheExpired(memoryCache, ttlMs)) {
    return memoryCache.priceData;
  }

  // If memory cache is missing or expired, try chrome.storage.local
  try {
    const result = await chrome.storage.local.get(PRICE_CACHE_KEY);
    const cachedData: unknown = result[PRICE_CACHE_KEY];

    // Check if we have data and it's valid
    if (!cachedData || !isValidCache(cachedData)) {
      return null;
    }

    // Update the in-memory mirror
    memoryCache = cachedData;

    // Check if the cache has expired
    if (isCacheExpired(cachedData, ttlMs)) {
      return null;
    }

    // Return the cached price data
    return cachedData.priceData;
  } catch (error) {
    throw new CacheError(
      `Failed to read price cache: ${error instanceof Error ? error.message : String(error)}`,
      CacheErrorCode.READ_ERROR
    );
  }
}

/**
 * Stores Bitcoin price data in the cache
 * @param data The PriceData to cache
 * @returns Promise that resolves when the data is cached
 * @throws CacheError if there's an error writing to storage
 */
export async function setCachedPrice(data: PriceData): Promise<void> {
  // Create the cache object
  const cacheData: LocalStorageCache = {
    priceData: data,
    cachedAt: Date.now(),
    version: CACHE_VERSION
  };

  // Update the in-memory mirror
  memoryCache = cacheData;

  // Update chrome.storage.local
  try {
    await chrome.storage.local.set({ [PRICE_CACHE_KEY]: cacheData });
  } catch (error) {
    throw new CacheError(
      `Failed to write price cache: ${error instanceof Error ? error.message : String(error)}`,
      CacheErrorCode.WRITE_ERROR
    );
  }
}

/**
 * Clears the price cache from both memory and storage
 * @returns Promise that resolves when the cache is cleared
 * @throws CacheError if there's an error accessing storage
 */
export async function clearCache(): Promise<void> {
  // Clear the in-memory mirror
  memoryCache = null;
  
  // Clear from chrome.storage.local
  try {
    await chrome.storage.local.remove(PRICE_CACHE_KEY);
  } catch (error) {
    throw new CacheError(
      `Failed to clear price cache: ${error instanceof Error ? error.message : String(error)}`,
      CacheErrorCode.WRITE_ERROR
    );
  }
}