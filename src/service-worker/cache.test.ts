import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PriceData, LocalStorageCache } from '../common/types';
import { PRICE_CACHE_KEY, DEFAULT_CACHE_TTL_MS } from '../common/constants';

// Mock chrome.storage.local
const mockStorage = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn()
};

// Mock Date.now() for consistent testing
const NOW = 1734447415000; // A fixed timestamp for testing

describe('cache.ts', () => {
  // Define functions that will be dynamically imported
  let getCachedPrice: any;
  let setCachedPrice: any;
  let clearCache: any;
  let rehydrateCache: any;
  let CacheError: any;
  let CacheErrorCode: any;
  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock chrome storage
    global.chrome = {
      storage: {
        local: mockStorage
      }
    } as any;

    // Mock Date.now for consistent time testing
    vi.spyOn(Date, 'now').mockReturnValue(NOW);

    // Clear the module's memory cache by importing fresh
    vi.resetModules();

    // Re-import the module to get a fresh state
    const cacheModule = await import('./cache');
    setCachedPrice = cacheModule.setCachedPrice;
    getCachedPrice = cacheModule.getCachedPrice;
    clearCache = cacheModule.clearCache;
    rehydrateCache = cacheModule.rehydrateCache;
    CacheError = cacheModule.CacheError;
    CacheErrorCode = cacheModule.CacheErrorCode;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const validPriceData: PriceData = {
    usdRate: 43000,
    satoshiRate: 0.00043,
    fetchedAt: NOW - 1000,
    source: 'CoinGecko'
  };

  const validCacheData: LocalStorageCache = {
    priceData: validPriceData,
    cachedAt: NOW - 1000,
    version: 1
  };

  describe('CacheError', () => {
    it('should create an error with code and message', () => {
      const error = new CacheError('Test error', CacheErrorCode.READ_ERROR);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(CacheErrorCode.READ_ERROR);
      expect(error.name).toBe('CacheError');
    });

    it('should support all error codes', () => {
      const readError = new CacheError('Read failed', CacheErrorCode.READ_ERROR);
      const writeError = new CacheError('Write failed', CacheErrorCode.WRITE_ERROR);
      const invalidError = new CacheError('Invalid data', CacheErrorCode.INVALID_DATA);
      
      expect(readError.code).toBe('cache_read_error');
      expect(writeError.code).toBe('cache_write_error');
      expect(invalidError.code).toBe('cache_invalid_data');
    });
  });

  describe('getCachedPrice', () => {
    it('should return cached price data when valid and not expired', async () => {
      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: validCacheData
      });

      const result = await getCachedPrice();

      expect(mockStorage.get).toHaveBeenCalledWith(PRICE_CACHE_KEY);
      expect(result).toEqual(validPriceData);
    });

    it('should return null when no cached data exists', async () => {
      mockStorage.get.mockResolvedValueOnce({});

      const result = await getCachedPrice();

      expect(result).toBeNull();
    });

    it('should return null when cached data is expired with default TTL', async () => {
      const expiredData: LocalStorageCache = {
        ...validCacheData,
        cachedAt: NOW - DEFAULT_CACHE_TTL_MS - 1000
      };

      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: expiredData
      });

      const result = await getCachedPrice();

      expect(result).toBeNull();
    });

    it('should respect custom TTL parameter', async () => {
      const customTTL = 5000; // 5 seconds
      const recentData: LocalStorageCache = {
        ...validCacheData,
        cachedAt: NOW - 3000 // 3 seconds ago
      };

      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: recentData
      });

      const result = await getCachedPrice(customTTL);

      expect(result).toEqual(validPriceData);
    });

    it('should return null when cache is expired with custom TTL', async () => {
      const customTTL = 1000; // 1 second
      const oldData: LocalStorageCache = {
        ...validCacheData,
        cachedAt: NOW - 2000 // 2 seconds ago
      };

      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: oldData
      });

      const result = await getCachedPrice(customTTL);

      expect(result).toBeNull();
    });

    it('should return null when cache data is invalid - not an object', async () => {
      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: 'invalid string data'
      });

      const result = await getCachedPrice();

      expect(result).toBeNull();
    });

    it('should return null when cache data is missing required properties', async () => {
      const invalidData = {
        priceData: validPriceData,
        // missing cachedAt and version
      };

      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: invalidData
      });

      const result = await getCachedPrice();

      expect(result).toBeNull();
    });

    it('should return null when price data is invalid', async () => {
      const invalidPriceData = {
        priceData: {
          usdRate: 'not a number', // Invalid type
          satoshiRate: 0.00043,
          fetchedAt: NOW - 1000,
          source: 'CoinGecko'
        },
        cachedAt: NOW - 1000,
        version: 1
      };

      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: invalidPriceData
      });

      const result = await getCachedPrice();

      expect(result).toBeNull();
    });

    it('should throw CacheError when storage read fails', async () => {
      mockStorage.get.mockRejectedValueOnce(new Error('Storage error'));

      try {
        await getCachedPrice();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CacheError);
        expect((error as any).code).toBe(CacheErrorCode.READ_ERROR);
        expect((error as any).message).toBe('Failed to read price cache: Storage error');
      }
    });

    it('should use in-memory cache when available and not expired', async () => {
      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: validCacheData
      });

      // First call loads from storage and sets memory cache
      const result1 = await getCachedPrice();
      expect(mockStorage.get).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(validPriceData);

      // Second call should use memory cache
      const result2 = await getCachedPrice();
      expect(mockStorage.get).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(result2).toEqual(validPriceData);
    });
  });

  describe('setCachedPrice', () => {
    it('should store price data with current timestamp and version', async () => {
      await setCachedPrice(validPriceData);

      const expectedCache: LocalStorageCache = {
        priceData: validPriceData,
        cachedAt: NOW,
        version: 1
      };

      expect(mockStorage.set).toHaveBeenCalledWith({
        [PRICE_CACHE_KEY]: expectedCache
      });
    });

    it('should throw CacheError when storage write fails', async () => {
      mockStorage.set.mockRejectedValueOnce(new Error('Write error'));

      try {
        await setCachedPrice(validPriceData);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CacheError);
        expect((error as any).code).toBe(CacheErrorCode.WRITE_ERROR);
        expect((error as any).message).toBe('Failed to write price cache: Write error');
      }
    });

    it('should update in-memory cache', async () => {
      await setCachedPrice(validPriceData);

      // Verify memory cache is updated by calling getCachedPrice
      // which should return data without calling storage
      mockStorage.get.mockResolvedValueOnce({});
      const result = await getCachedPrice();
      
      expect(mockStorage.get).not.toHaveBeenCalled();
      expect(result).toEqual(validPriceData);
    });
  });

  describe('clearCache', () => {
    it('should remove cached data from storage', async () => {
      await clearCache();

      expect(mockStorage.remove).toHaveBeenCalledWith(PRICE_CACHE_KEY);
    });

    it('should throw CacheError when storage remove fails', async () => {
      mockStorage.remove.mockRejectedValueOnce(new Error('Remove error'));

      try {
        await clearCache();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CacheError);
        expect((error as any).code).toBe(CacheErrorCode.WRITE_ERROR);
        expect((error as any).message).toBe('Failed to clear price cache: Remove error');
      }
    });

    it('should clear in-memory cache', async () => {
      // First set some data
      await setCachedPrice(validPriceData);
      
      // Clear the cache
      await clearCache();
      
      // Verify memory cache is cleared by checking that getCachedPrice
      // tries to read from storage
      mockStorage.get.mockResolvedValueOnce({});
      await getCachedPrice();
      
      expect(mockStorage.get).toHaveBeenCalled();
    });
  });

  describe('rehydrateCache', () => {
    it('should load valid cache data from storage', async () => {
      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: validCacheData
      });

      await rehydrateCache();

      expect(mockStorage.get).toHaveBeenCalledWith(PRICE_CACHE_KEY);
    });

    it('should not throw when storage read fails', async () => {
      mockStorage.get.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw
      await rehydrateCache();
    });

    it('should not set memory cache for invalid data', async () => {
      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: 'invalid data'
      });

      await rehydrateCache();

      // Verify memory cache is not set by checking that getCachedPrice
      // still tries to read from storage
      mockStorage.get.mockResolvedValueOnce({});
      await getCachedPrice();
      
      expect(mockStorage.get).toHaveBeenCalledTimes(2);
    });

    it('should set memory cache for valid data', async () => {
      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: validCacheData
      });

      await rehydrateCache();

      // Verify memory cache is set by checking that getCachedPrice
      // doesn't need to read from storage
      const result = await getCachedPrice();
      
      expect(mockStorage.get).toHaveBeenCalledTimes(1); // Only from rehydrate
      expect(result).toEqual(validPriceData);
    });
  });

  describe('isValidCache', () => {
    it('should validate correct cache structure', async () => {
      // Test through getCachedPrice which calls isValidCache internally
      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: validCacheData
      });

      const result = await getCachedPrice();
      expect(result).toEqual(validPriceData);
    });

    it('should reject null data', async () => {
      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: null
      });

      const result = await getCachedPrice();
      expect(result).toBeNull();
    });

    it('should reject non-object data', async () => {
      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: 42
      });

      const result = await getCachedPrice();
      expect(result).toBeNull();
    });

    it('should reject data missing cachedAt', async () => {
      const invalidData = {
        priceData: validPriceData,
        version: 1
        // missing cachedAt
      };

      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: invalidData
      });

      const result = await getCachedPrice();
      expect(result).toBeNull();
    });

    it('should reject data missing version', async () => {
      const invalidData = {
        priceData: validPriceData,
        cachedAt: NOW - 1000
        // missing version
      };

      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: invalidData
      });

      const result = await getCachedPrice();
      expect(result).toBeNull();
    });

    it('should reject data missing priceData', async () => {
      const invalidData = {
        cachedAt: NOW - 1000,
        version: 1
        // missing priceData
      };

      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: invalidData
      });

      const result = await getCachedPrice();
      expect(result).toBeNull();
    });

    it('should reject price data with invalid types', async () => {
      const priceDataTestCases = [
        { ...validPriceData, usdRate: 'not a number' },
        { ...validPriceData, satoshiRate: 'not a number' },
        { ...validPriceData, fetchedAt: 'not a number' },
        { ...validPriceData, source: 123 }
      ];

      for (const invalidPriceData of priceDataTestCases) {
        mockStorage.get.mockResolvedValueOnce({
          [PRICE_CACHE_KEY]: {
            priceData: invalidPriceData,
            cachedAt: NOW - 1000,
            version: 1
          }
        });

        const result = await getCachedPrice();
        expect(result).toBeNull();
      }
    });
  });

  describe('isCacheExpired', () => {
    it('should identify expired cache with default TTL', async () => {
      const expiredData: LocalStorageCache = {
        ...validCacheData,
        cachedAt: NOW - DEFAULT_CACHE_TTL_MS - 1
      };

      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: expiredData
      });

      const result = await getCachedPrice();
      expect(result).toBeNull();
    });

    it('should identify non-expired cache with default TTL', async () => {
      const freshData: LocalStorageCache = {
        ...validCacheData,
        cachedAt: NOW - DEFAULT_CACHE_TTL_MS + 1000 // 1 second before expiry
      };

      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: freshData
      });

      const result = await getCachedPrice();
      expect(result).toEqual(validPriceData);
    });

    it('should respect custom TTL for expiration check', async () => {
      const customTTL = 60000; // 1 minute
      const dataAge = 30000; // 30 seconds old
      
      const recentData: LocalStorageCache = {
        ...validCacheData,
        cachedAt: NOW - dataAge
      };

      mockStorage.get.mockResolvedValueOnce({
        [PRICE_CACHE_KEY]: recentData
      });

      const result = await getCachedPrice(customTTL);
      expect(result).toEqual(validPriceData);
    });
  });
});