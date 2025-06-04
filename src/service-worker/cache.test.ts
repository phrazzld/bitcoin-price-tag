import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PriceData, PriceRequestMessage, LocalStorageCache } from '../common/types';
import { REFRESH_ALARM_NAME, DEFAULT_CACHE_TTL_MS } from '../common/constants';
import { isValidCache } from './cache';

// Mock objects created at module level but applied in beforeEach
const mockChrome = {
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() }
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: { addListener: vi.fn() }
  }
};

const mockStorage = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn()
};

const mockFetch = vi.fn();

// Test for the cached price functionality specifically
describe('Cache functionality test', () => {
  let handlers: {
    onMessage?: Function;
  };
  const mockSendResponse = vi.fn();
  
  // Define test data
  const validRequest: PriceRequestMessage = {
    type: 'PRICE_REQUEST',
    requestId: 'test-request-123',
    timestamp: Date.now()
  };
  
  const validCachedData: PriceData = {
    usdRate: 45000,
    satoshiRate: 0.00045,
    fetchedAt: Date.now() - 5000,
    source: 'CoinGecko'
  };
  
  beforeEach(async () => {
    // Clear all mocks and reset module state
    vi.clearAllMocks();
    vi.resetModules();
    mockStorage.get.mockReset();
    mockStorage.set.mockReset();
    mockFetch.mockReset();
    mockSendResponse.mockReset();
    
    // Set up fake timers
    vi.useFakeTimers();
    
    // Setup global chrome mock fresh each time
    global.chrome = mockChrome as any;
    global.chrome.storage = {
      local: mockStorage
    } as any;
    
    // Setup global fetch mock fresh each time
    global.fetch = mockFetch as any;
    
    // Mock Date.now for consistent timestamps
    vi.spyOn(Date, 'now').mockReturnValue(1734447415000);
    
    // Import the module fresh
    await vi.importActual('./index');
    
    // Extract handlers from mocks
    if (mockChrome.runtime.onMessage.addListener.mock.calls.length > 0) {
      handlers = {
        onMessage: mockChrome.runtime.onMessage.addListener.mock.calls[0][0]
      };
    } else {
      throw new Error('Message handler not registered');
    }
  });
  
  afterEach(() => {
    // Comprehensive cleanup of all state
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.resetModules();
    
    // Clean up global state
    delete (global as any).chrome;
    delete (global as any).fetch;
    
    // Reset handlers
    handlers = {};
  });
  
  it('should return cached price when available', async () => {
    // Mock getCachedPrice directly through the imported module
    vi.doMock('./cache', () => ({
      getCachedPrice: vi.fn().mockResolvedValue(validCachedData),
      setCachedPrice: vi.fn().mockResolvedValue(undefined),
      rehydrateCache: vi.fn().mockResolvedValue(undefined),
      clearCache: vi.fn().mockResolvedValue(undefined),
      CacheError: class CacheError extends Error {},
      CacheErrorCode: { READ_ERROR: 'read_error', WRITE_ERROR: 'write_error', INVALID_DATA: 'invalid_data' }
    }));
    
    // Reset module registry to use the mocked cache module
    vi.resetModules();
    
    // Re-import handlers with the mocked dependencies
    await vi.importActual('./index');
    
    // Extract handler (again, since we reset the modules)
    const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
    
    // Call the message handler
    const result = messageHandler(
      validRequest,
      { tab: { id: 1 } },
      mockSendResponse
    );
    
    // Verify it returns true (indicating async handling)
    expect(result).toBe(true);
    
    // Wait for all async operations to complete
    await vi.runAllTimersAsync();
    
    // Verify the fetch API was not called (crucial test)
    expect(mockFetch).not.toHaveBeenCalled();
    
    // Verify the response was sent with the correct cached data
    expect(mockSendResponse).toHaveBeenCalledWith({
      requestId: validRequest.requestId,
      type: 'PRICE_RESPONSE',
      status: 'success',
      data: validCachedData,
      timestamp: expect.any(Number)
    });
  });
});

describe('isValidCache', () => {
  const validPriceData: PriceData = {
    usdRate: 45000.50,
    satoshiRate: 0.00000001,
    fetchedAt: 1640995200000,
    source: 'coingecko'
  };

  let validCache: LocalStorageCache;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Mock Date.now to return a consistent timestamp
    vi.spyOn(Date, 'now').mockReturnValue(1640995300000); // 100 seconds after fetchedAt
    
    // Create valid cache with proper timestamp after mocking Date.now
    validCache = {
      priceData: validPriceData,
      cachedAt: Date.now() - 1000, // 1 second ago
      version: 1
    };
  });

  afterEach(() => {
    // Comprehensive cleanup
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('valid cache', () => {
    it('should return true for valid fresh cache', () => {
      expect(isValidCache(validCache)).toBe(true);
    });

    it('should return true for cache at exact age boundary', () => {
      const cacheAtBoundary = {
        ...validCache,
        cachedAt: Date.now() - DEFAULT_CACHE_TTL_MS + 1
      };
      expect(isValidCache(cacheAtBoundary)).toBe(true);
    });
  });

  describe('invalid input types', () => {
    it('should return false for null', () => {
      expect(isValidCache(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidCache(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isValidCache('string')).toBe(false);
      expect(isValidCache(123)).toBe(false);
      expect(isValidCache(true)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isValidCache([])).toBe(false);
      expect(isValidCache([1, 2, 3])).toBe(false);
    });
  });

  describe('missing required properties', () => {
    it('should return false when missing priceData', () => {
      const cache = { ...validCache };
      delete (cache as any).priceData;
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false when missing cachedAt', () => {
      const cache = { ...validCache };
      delete (cache as any).cachedAt;
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false when missing version', () => {
      const cache = { ...validCache };
      delete (cache as any).version;
      expect(isValidCache(cache)).toBe(false);
    });
  });

  describe('extra properties', () => {
    it('should return false when cache has extra properties', () => {
      const cache = { ...validCache, extra: 'value' };
      expect(isValidCache(cache)).toBe(false);
    });
  });

  describe('invalid priceData', () => {
    it('should return false for null priceData', () => {
      const cache = { ...validCache, priceData: null };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false for non-object priceData', () => {
      const cache = { ...validCache, priceData: 'string' };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false when priceData is missing usdRate', () => {
      const priceData = { ...validPriceData };
      delete (priceData as any).usdRate;
      const cache = { ...validCache, priceData };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false when priceData has invalid usdRate', () => {
      const cache = { ...validCache, priceData: { ...validPriceData, usdRate: -1 } };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false when priceData has NaN usdRate', () => {
      const cache = { ...validCache, priceData: { ...validPriceData, usdRate: NaN } };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false when priceData has Infinity usdRate', () => {
      const cache = { ...validCache, priceData: { ...validPriceData, usdRate: Infinity } };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false when priceData is missing satoshiRate', () => {
      const priceData = { ...validPriceData };
      delete (priceData as any).satoshiRate;
      const cache = { ...validCache, priceData };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false when priceData has invalid satoshiRate', () => {
      const cache = { ...validCache, priceData: { ...validPriceData, satoshiRate: 0 } };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false when priceData is missing fetchedAt', () => {
      const priceData = { ...validPriceData };
      delete (priceData as any).fetchedAt;
      const cache = { ...validCache, priceData };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false when priceData has invalid fetchedAt', () => {
      const cache = { ...validCache, priceData: { ...validPriceData, fetchedAt: -1 } };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false when priceData is missing source', () => {
      const priceData = { ...validPriceData };
      delete (priceData as any).source;
      const cache = { ...validCache, priceData };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false when priceData has invalid source', () => {
      const cache = { ...validCache, priceData: { ...validPriceData, source: '' } };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false when priceData has extra properties', () => {
      const cache = { ...validCache, priceData: { ...validPriceData, extra: 'value' } };
      expect(isValidCache(cache)).toBe(false);
    });
  });

  describe('invalid cachedAt', () => {
    it('should return false for non-number cachedAt', () => {
      const cache = { ...validCache, cachedAt: '1640995200000' };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false for negative cachedAt', () => {
      const cache = { ...validCache, cachedAt: -1 };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false for zero cachedAt', () => {
      const cache = { ...validCache, cachedAt: 0 };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false for NaN cachedAt', () => {
      const cache = { ...validCache, cachedAt: NaN };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false for Infinity cachedAt', () => {
      const cache = { ...validCache, cachedAt: Infinity };
      expect(isValidCache(cache)).toBe(false);
    });
  });

  describe('invalid version', () => {
    it('should return false for non-number version', () => {
      const cache = { ...validCache, version: '1' };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false for non-integer version', () => {
      const cache = { ...validCache, version: 1.5 };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false for zero version', () => {
      const cache = { ...validCache, version: 0 };
      expect(isValidCache(cache)).toBe(false);
    });

    it('should return false for negative version', () => {
      const cache = { ...validCache, version: -1 };
      expect(isValidCache(cache)).toBe(false);
    });
  });

  describe('cache age validation', () => {
    it('should return false for expired cache', () => {
      const expiredCache = {
        ...validCache,
        cachedAt: Date.now() - DEFAULT_CACHE_TTL_MS - 1000 // 1 second past expiry
      };
      expect(isValidCache(expiredCache)).toBe(false);
    });

    it('should return false for cache with future timestamp', () => {
      const futureCache = {
        ...validCache,
        cachedAt: Date.now() + 1000 // 1 second in the future
      };
      expect(isValidCache(futureCache)).toBe(false);
    });

    it('should return false for cache at exact expiry boundary', () => {
      const expiredCache = {
        ...validCache,
        cachedAt: Date.now() - DEFAULT_CACHE_TTL_MS
      };
      expect(isValidCache(expiredCache)).toBe(false);
    });
  });
});