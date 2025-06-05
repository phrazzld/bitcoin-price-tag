/**
 * Mock for Chrome storage API
 * Used to simulate extension storage in tests
 */

import { vi } from 'vitest';
import type { LocalStorageCache, PriceData } from '../../src/common/types';
import { PRICE_CACHE_KEY } from '../../src/common/constants';

/**
 * Represents a simple key-value store for the mock storage.
 */
interface StorageStore {
  [key: string]: any;
}

/**
 * Configuration options for creating a Chrome storage API mock.
 */
export interface StorageMockConfig {
  /**
   * Initial data to populate the storage with.
   * @default {} (empty object)
   */
  initialData?: StorageStore;
  
  /**
   * Whether storage operations should fail.
   * @default false
   */
  shouldFail?: boolean;
  
  /**
   * The error message to use when simulating failed storage operations.
   * @default 'Storage error'
   */
  failureMessage?: string;
}

/**
 * Creates a mock implementation of the Chrome storage.local API for testing.
 * 
 * This function returns an object that mimics the Chrome storage.local API with
 * get, set, remove, and clear methods. It allows tests to simulate storage operations
 * without requiring the actual Chrome extension environment.
 * 
 * @param config - Configuration options for the mock behavior
 * @returns An object implementing the Chrome storage.local API interface
 * @throws Will reject Promises with the specified error message if shouldFail is true
 * 
 * @example
 * // Basic usage with empty storage
 * global.chrome = {
 *   storage: {
 *     local: createStorageMock()
 *   }
 * } as any;
 * 
 * @example
 * // Initialize with data
 * const mockStorage = createStorageMock({
 *   initialData: {
 *     'user-preferences': { theme: 'dark' }
 *   }
 * });
 * 
 * @example
 * // Simulate storage errors
 * const failingStorage = createStorageMock({
 *   shouldFail: true,
 *   failureMessage: 'Storage quota exceeded'
 * });
 */
export function createStorageMock(config: StorageMockConfig = {}) {
  const { 
    initialData = {}, 
    shouldFail = false, 
    failureMessage = 'Storage error' 
  } = config;
  
  const store: StorageStore = { ...initialData };

  const mockGet = vi.fn().mockImplementation((keys: string | string[] | null | undefined) => {
    if (shouldFail) {
      return Promise.reject(new Error(failureMessage));
    }

    if (keys === null || keys === undefined) {
      return Promise.resolve(store);
    }

    if (typeof keys === 'string') {
      // Return object with key as property name, matching Chrome storage behavior
      return Promise.resolve({ [keys]: store[keys] });
    }

    const result: StorageStore = {};
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        if (key in store) {
          result[key] = store[key];
        }
      });
    }
    
    return Promise.resolve(result);
  });

  const mockSet = vi.fn().mockImplementation((items: StorageStore) => {
    if (shouldFail) {
      return Promise.reject(new Error(failureMessage));
    }

    Object.assign(store, items);
    return Promise.resolve();
  });

  const mockRemove = vi.fn().mockImplementation((keys: string | string[]) => {
    if (shouldFail) {
      return Promise.reject(new Error(failureMessage));
    }

    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach(key => delete store[key]);
    
    return Promise.resolve();
  });

  const mockClear = vi.fn().mockImplementation(() => {
    if (shouldFail) {
      return Promise.reject(new Error(failureMessage));
    }

    Object.keys(store).forEach(key => delete store[key]);
    return Promise.resolve();
  });

  return {
    get: mockGet,
    set: mockSet,
    remove: mockRemove,
    clear: mockClear,
    // Expose store for testing
    getStore: () => store,
  };
}

/**
 * Creates a mock storage with cached Bitcoin price data.
 * 
 * This helper makes it easy to simulate a scenario where the extension has
 * previously cached price data. It's useful for testing the cache retrieval
 * logic in the service worker.
 * 
 * @param priceData - The Bitcoin price data to be cached
 * @param ageMs - The age of the cache in milliseconds (how long ago it was cached)
 * @returns A mock Chrome storage.local API instance with the cache pre-populated
 * 
 * @example
 * // Create storage with fresh cache (just cached now)
 * const mockPriceData = {
 *   usdRate: 45000,
 *   satoshiRate: 0.00002222,
 *   fetchedAt: Date.now(),
 *   source: 'CoinGecko'
 * };
 * const mockStorage = createStorageWithCache(mockPriceData);
 * 
 * @example
 * // Create storage with older cache (cached 5 minutes ago)
 * const fiveMinutesMs = 5 * 60 * 1000;
 * const mockStorage = createStorageWithCache(mockPriceData, fiveMinutesMs);
 */
export function createStorageWithCache(priceData: PriceData, ageMs: number = 0) {
  const now = Date.now();
  const cache: LocalStorageCache = {
    priceData,
    cachedAt: now - ageMs,
    version: 1,
  };

  return createStorageMock({
    initialData: {
      [PRICE_CACHE_KEY]: cache,
    },
  });
}

/**
 * Creates an empty mock Chrome storage.
 * 
 * This is a convenience function for the common use case of needing an empty
 * storage mock for tests where no pre-existing data is needed.
 * 
 * @returns A mock Chrome storage.local API instance with no data
 * 
 * @example
 * global.chrome = {
 *   storage: {
 *     local: createEmptyStorage()
 *   }
 * } as any;
 */
export function createEmptyStorage() {
  return createStorageMock();
}

/**
 * Creates a mock Chrome storage that simulates failures for all operations.
 * 
 * This helper is used to test error handling paths in code that interacts with
 * Chrome storage. All storage operations will fail with the provided message.
 * 
 * @param message - The error message for the storage failure
 * @returns A mock Chrome storage.local API that fails all operations
 * @throws All storage operations reject with the specified error message
 * 
 * @example
 * // Test error handling for storage failures
 * global.chrome = {
 *   storage: {
 *     local: createFailingStorage('QUOTA_BYTES quota exceeded')
 *   }
 * } as any;
 * 
 * // Now any storage operations will fail
 * try {
 *   await chrome.storage.local.set({ key: 'value' });
 * } catch (error) {
 *   // Will enter this catch block with the error message 'QUOTA_BYTES quota exceeded'
 * }
 */
export function createFailingStorage(message = 'Storage error') {
  return createStorageMock({
    shouldFail: true,
    failureMessage: message,
  });
}