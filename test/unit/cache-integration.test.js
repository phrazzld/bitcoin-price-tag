/**
 * Integration tests for caching system
 * Tests integration between background.js and the cache-manager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ErrorTypes, ErrorSeverity are used in implementation but not directly in tests
import {} from '../../error-handling.js';
import {
  CACHE_FRESHNESS,
  getCachedPriceData,
  cachePriceData,
  clearAllCaches,
} from '../../cache-manager.js';

// Mock chrome.storage.local
const mockChromeStorage = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
};

// Mock localStorage
let mockLocalStorage = {};

// Setup before tests
beforeEach(() => {
  // Reset mocks
  vi.resetAllMocks();

  // Mock chrome global with runtime for setup.js compatibility
  global.chrome = {
    storage: {
      local: mockChromeStorage,
    },
    runtime: {
      lastError: null,
    },
  };

  // Mock localStorage
  mockLocalStorage = {};
  global.localStorage = {
    getItem: vi.fn((key) => mockLocalStorage[key] || null),
    setItem: vi.fn((key, value) => {
      mockLocalStorage[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete mockLocalStorage[key];
    }),
  };

  // Mock navigator.onLine
  Object.defineProperty(global.navigator, 'onLine', {
    writable: true,
    value: true,
  });
});

// Clean up after tests
afterEach(async () => {
  await clearAllCaches();
  vi.restoreAllMocks();
});

describe('Cache Integration', () => {
  // Test basic caching functionality
  describe('Basic Cache Operations', () => {
    it('should store and retrieve data from cache', async () => {
      // Mock data to cache
      const testData = {
        btcPrice: 50000,
        satPrice: 0.0005,
        timestamp: Date.now(),
        source: 'test',
      };

      // Setup mock for chrome.storage.local.get
      mockChromeStorage.get.mockImplementation((keys, callback) => {
        if (typeof callback === 'function') {
          callback({ btcPriceData: testData });
        }
        return Promise.resolve({ btcPriceData: testData });
      });

      // Cache the data
      await cachePriceData(testData);

      // Verify chrome.storage.local.set was called
      expect(mockChromeStorage.set).toHaveBeenCalled();

      // Retrieve the data
      const cachedData = await getCachedPriceData();

      // Should have returned the cached data
      expect(cachedData).not.toBeNull();
      expect(cachedData.btcPrice).toBe(testData.btcPrice);
      expect(cachedData.satPrice).toBe(testData.satPrice);
    });

    it('should respect cache freshness', async () => {
      // Mock a fresh cache entry
      const freshData = {
        btcPrice: 50000,
        satPrice: 0.0005,
        timestamp: Date.now(),
        source: 'test',
      };

      // Mock a stale cache entry
      const staleData = {
        btcPrice: 45000,
        satPrice: 0.00045,
        timestamp: Date.now() - 60 * 60 * 1000, // 1 hour old
        source: 'test',
      };

      // Cache the fresh data in localStorage and stale in chrome.storage
      mockLocalStorage['btcPriceTagLocalCache'] = JSON.stringify(freshData);

      mockChromeStorage.get.mockImplementation((keys, callback) => {
        if (typeof callback === 'function') {
          callback({ btcPriceData: staleData });
        }
        return Promise.resolve({ btcPriceData: staleData });
      });

      // Retrieve the data - should prefer the fresher one
      const cachedData = await getCachedPriceData();

      // Should return the fresh data from localStorage, not the stale chrome.storage data
      expect(cachedData).not.toBeNull();
      expect(cachedData.btcPrice).toBe(freshData.btcPrice);
      expect(cachedData.freshness).toBe(CACHE_FRESHNESS.FRESH);
    });
  });

  // Test offline handling
  describe('Offline Mode Handling', () => {
    it('should use cache in offline mode', async () => {
      // Make the device "offline"
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
      });

      // Mock cached data
      const cachedData = {
        btcPrice: 50000,
        satPrice: 0.0005,
        timestamp: Date.now() - 12 * 60 * 60 * 1000, // 12 hours old (very stale)
        source: 'test',
      };

      // Set up localStorage cache
      mockLocalStorage['btcPriceTagLocalCache'] = JSON.stringify(cachedData);

      // Also setup chrome.storage mock to return empty data
      mockChromeStorage.get.mockImplementation((keys, callback) => {
        if (typeof callback === 'function') {
          callback({});
        }
        return Promise.resolve({});
      });

      // Retrieve the data
      const retrievedData = await getCachedPriceData();

      // Should return the cached data even though it's very stale
      expect(retrievedData).not.toBeNull();
      expect(retrievedData.btcPrice).toBe(cachedData.btcPrice);
      expect(retrievedData.freshness).toBe(CACHE_FRESHNESS.VERY_STALE);
    });
  });

  // Test cache fallback behavior
  describe('Cache Fallback Behavior', () => {
    it('should fallback to localStorage when chrome.storage fails', async () => {
      // Make chrome.storage.local.get throw an error
      mockChromeStorage.get.mockImplementation((keys, callback) => {
        if (typeof callback === 'function') {
          // Call the callback with an empty result before throwing
          callback({});
        }
        throw new Error('Chrome storage error');
      });

      // Mock localStorage data
      const localData = {
        btcPrice: 50000,
        satPrice: 0.0005,
        timestamp: Date.now(),
        source: 'localStorage',
      };

      // Set up localStorage cache
      mockLocalStorage['btcPriceTagLocalCache'] = JSON.stringify(localData);

      // Retrieve the data
      const retrievedData = await getCachedPriceData();

      // Should return the localStorage data
      expect(retrievedData).not.toBeNull();
      expect(retrievedData.btcPrice).toBe(localData.btcPrice);
      expect(retrievedData.source).toBe('localStorage');
    });

    it('should work when only memory cache is available', async () => {
      // Make chrome.storage fail
      mockChromeStorage.get.mockImplementation((keys, callback) => {
        if (typeof callback === 'function') {
          // Call the callback with an empty result before throwing
          callback({});
        }
        throw new Error('Chrome storage error');
      });

      // Make localStorage fail
      global.localStorage.getItem.mockImplementation(() => {
        throw new Error('LocalStorage error');
      });

      // Prepare memory cache data
      const memoryData = {
        btcPrice: 50000,
        satPrice: 0.0005,
        timestamp: Date.now(),
        source: 'memoryOnly',
      };

      // Properly seed the memory cache by calling cachePriceData
      // This will add the data directly to the memory cache
      // We mock localStorage and chrome.storage to fail, so only memory cache will work
      await cachePriceData(memoryData);

      // Retrieve the data
      const retrievedData = await getCachedPriceData();

      // Since the other caches are throwing errors, we should get the memory cache data
      expect(retrievedData).not.toBeNull();
      expect(retrievedData.btcPrice).toBe(memoryData.btcPrice);
      expect(retrievedData.fromMemoryCache).toBe(true);
    });
  });
});
