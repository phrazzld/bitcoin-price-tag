import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { REFRESH_ALARM_NAME, DEFAULT_CACHE_TTL_MS } from '../common/constants';
import { PriceData, PriceRequestMessage } from '../common/types';

// Mock Chrome APIs
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

// Setup global chrome mock
global.chrome = mockChrome as any;

// Store the original console methods
const originalConsole = {
  log: console.log,
  error: console.error
};

// Create mocks that will be used in assertions
const mockConsole = {
  log: vi.fn(),
  error: vi.fn()
};

// Replace console methods with our mocks
console.log = mockConsole.log;
console.error = mockConsole.error;

// Mock for chrome.storage.local (needed by cache.ts)
const mockStorage = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn()
};

// Mock fetch for api.ts
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('service-worker/index.ts', () => {
  let handlers: {
    onInstalled?: Function;
    onStartup?: Function;
    onAlarm?: Function;
    onMessage?: Function;
  };

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    mockConsole.log.mockClear();
    mockConsole.error.mockClear();
    
    // Replace console methods with mocks for each test
    console.log = mockConsole.log;
    console.error = mockConsole.error;
    
    // Reset chrome storage mock
    global.chrome.storage = {
      local: mockStorage
    } as any;

    // Mock Date.now for consistent timestamps
    vi.spyOn(Date, 'now').mockReturnValue(1734447415000);

    // Import the module fresh each time
    handlers = {};
    vi.resetModules();
    await vi.importActual('./index');

    // Extract handlers from mocks
    if (mockChrome.runtime.onInstalled.addListener.mock.calls.length > 0) {
      handlers.onInstalled = mockChrome.runtime.onInstalled.addListener.mock.calls[0][0];
    }
    if (mockChrome.runtime.onStartup.addListener.mock.calls.length > 0) {
      handlers.onStartup = mockChrome.runtime.onStartup.addListener.mock.calls[0][0];
    }
    if (mockChrome.alarms.onAlarm.addListener.mock.calls.length > 0) {
      handlers.onAlarm = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
    }
    if (mockChrome.runtime.onMessage.addListener.mock.calls.length > 0) {
      handlers.onMessage = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original console methods
    console.log = originalConsole.log;
    console.error = originalConsole.error;
  });

  describe('Event Listener Registration', () => {
    it('should register all event listeners on module load', () => {
      expect(mockChrome.runtime.onInstalled.addListener).toHaveBeenCalledOnce();
      expect(mockChrome.runtime.onStartup.addListener).toHaveBeenCalledOnce();
      expect(mockChrome.alarms.onAlarm.addListener).toHaveBeenCalledOnce();
      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalledOnce();
    });
  });

  describe('handleInstalled', () => {
    it('should create alarm successfully on install', async () => {
      mockChrome.alarms.clear.mockResolvedValueOnce(true);
      mockChrome.alarms.create.mockResolvedValueOnce(undefined);

      await handlers.onInstalled!({ reason: 'install' });

      expect(mockConsole.log).toHaveBeenCalledWith('Extension installed/updated:', 'install');
      expect(mockChrome.alarms.clear).toHaveBeenCalledWith(REFRESH_ALARM_NAME);
      expect(mockChrome.alarms.create).toHaveBeenCalledWith(REFRESH_ALARM_NAME, {
        periodInMinutes: DEFAULT_CACHE_TTL_MS / (60 * 1000),
        delayInMinutes: 1
      });
      expect(mockConsole.log).toHaveBeenCalledWith(`Alarm "${REFRESH_ALARM_NAME}" created successfully`);
    });

    it('should log previous version on update', async () => {
      mockChrome.alarms.clear.mockResolvedValueOnce(true);
      mockChrome.alarms.create.mockResolvedValueOnce(undefined);

      await handlers.onInstalled!({ 
        reason: 'update',
        previousVersion: '1.0.0'
      });

      expect(mockConsole.log).toHaveBeenCalledWith('Extension installed/updated:', 'update');
      expect(mockConsole.log).toHaveBeenCalledWith('Previous version:', '1.0.0');
    });

    it('should handle alarm creation failure', async () => {
      mockChrome.alarms.clear.mockResolvedValueOnce(true);
      mockChrome.alarms.create.mockRejectedValueOnce(new Error('Alarm creation failed'));

      await handlers.onInstalled!({ reason: 'install' });

      expect(mockConsole.error).toHaveBeenCalledWith('Failed to create alarm:', expect.any(Error));
    });

    it('should handle alarm clear failure', async () => {
      mockChrome.alarms.clear.mockRejectedValueOnce(new Error('Clear failed'));

      await handlers.onInstalled!({ reason: 'install' });

      expect(mockConsole.error).toHaveBeenCalledWith('Failed to create alarm:', expect.any(Error));
    });
  });

  describe('handleStartup', () => {
    it('should rehydrate cache successfully', async () => {
      // Mock successful cache rehydration
      mockStorage.get.mockResolvedValueOnce({
        'btc_price_cache': {
          priceData: {
            btcRate: 45000,
            satoshiRate: 0.00045,
            timestamp: Date.now() - 1000
          },
          cachedAt: Date.now() - 1000,
          version: 1
        }
      });

      await handlers.onStartup!();

      expect(mockConsole.log).toHaveBeenCalledWith('Service worker starting up');
      expect(mockConsole.log).toHaveBeenCalledWith('Cache successfully rehydrated');
      expect(mockStorage.get).toHaveBeenCalled();
    });

    it('should handle rehydration failure gracefully', async () => {
      mockStorage.get.mockRejectedValueOnce(new Error('Storage error'));

      await handlers.onStartup!();

      expect(mockConsole.log).toHaveBeenCalledWith('Service worker starting up');
      expect(mockConsole.error).toHaveBeenCalledWith('Failed to rehydrate cache:', expect.any(Error));
    });
  });

  describe('handleAlarm', () => {
    const validApiResponse = {
      bpi: {
        USD: {
          rate_float: 45000
        }
      }
    };

    it('should fetch and cache price on refresh alarm', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validApiResponse
      });

      // Mock storage operations
      mockStorage.set.mockResolvedValueOnce(undefined);

      await handlers.onAlarm!({ name: REFRESH_ALARM_NAME });

      expect(mockConsole.log).toHaveBeenCalledWith('Alarm fired:', REFRESH_ALARM_NAME);
      expect(mockConsole.log).toHaveBeenCalledWith('Starting price refresh...');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.coindesk.com/v1/bpi/currentprice/USD.json'
      );
      expect(mockStorage.set).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith('Price data cached successfully');
    });

    it('should handle API fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await handlers.onAlarm!({ name: REFRESH_ALARM_NAME });

      expect(mockConsole.error).toHaveBeenCalledWith('Failed to refresh price data:', expect.any(Error));
    });

    it('should handle cache write failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validApiResponse
      });
      mockStorage.set.mockRejectedValueOnce(new Error('Storage error'));

      await handlers.onAlarm!({ name: REFRESH_ALARM_NAME });

      expect(mockConsole.error).toHaveBeenCalledWith('Failed to refresh price data:', expect.any(Error));
    });

    it('should ignore unknown alarms', async () => {
      await handlers.onAlarm!({ name: 'unknown_alarm' });

      expect(mockConsole.log).toHaveBeenCalledWith('Alarm fired:', 'unknown_alarm');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    const mockSendResponse = vi.fn();
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

    beforeEach(() => {
      mockSendResponse.mockClear();
    });

    it('should return cached price when available', async () => {
      // Mock cached data
      mockStorage.get.mockResolvedValueOnce({
        'btc_price_cache': {
          priceData: validCachedData,
          cachedAt: Date.now() - 5000,
          version: 1
        }
      });

      const result = handlers.onMessage!(
        validRequest,
        { tab: { id: 1 } },
        mockSendResponse
      );

      expect(result).toBe(true); // Indicates async response

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockConsole.log).toHaveBeenCalledWith('Processing price request:', 'test-request-123');
      expect(mockConsole.log).toHaveBeenCalledWith('Price found in cache');
      expect(mockSendResponse).toHaveBeenCalledWith({
        requestId: 'test-request-123',
        type: 'PRICE_RESPONSE',
        status: 'success',
        data: validCachedData,
        timestamp: Date.now()
      });
    });

    it('should fetch fresh price on cache miss', async () => {
      // Mock empty cache
      mockStorage.get.mockResolvedValueOnce({});

      // Mock successful API response
      const apiResponse = {
        bpi: {
          USD: {
            rate_float: 46000
          }
        }
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => apiResponse
      });

      // Mock storage set
      mockStorage.set.mockResolvedValueOnce(undefined);

      const result = handlers.onMessage!(
        validRequest,
        { tab: { id: 1 } },
        mockSendResponse
      );

      expect(result).toBe(true);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockConsole.log).toHaveBeenCalledWith('Cache miss - fetching from API');
      expect(mockFetch).toHaveBeenCalled();
      expect(mockStorage.set).toHaveBeenCalled();
      expect(mockSendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-request-123',
          type: 'PRICE_RESPONSE',
          status: 'success',
          data: expect.objectContaining({
            btcRate: 46000
          })
        })
      );
    });

    it('should handle invalid message types', () => {
      const invalidMessage = {
        type: 'UNKNOWN_TYPE',
        requestId: 'test-123'
      };

      const result = handlers.onMessage!(
        invalidMessage,
        { tab: { id: 1 } },
        mockSendResponse
      );

      expect(result).toBe(false);
      expect(mockSendResponse).toHaveBeenCalledWith({
        type: 'PRICE_RESPONSE',
        status: 'error',
        error: {
          message: 'Unknown message type',
          code: 'unknown_message'
        },
        timestamp: Date.now()
      });
    });

    it('should handle missing required fields in message', () => {
      const invalidMessage = {
        type: 'PRICE_REQUEST'
        // missing requestId and timestamp
      };

      const result = handlers.onMessage!(
        invalidMessage,
        { tab: { id: 1 } },
        mockSendResponse
      );

      expect(result).toBe(false);
      expect(mockSendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PRICE_RESPONSE',
          status: 'error',
          error: expect.objectContaining({
            code: 'unknown_message'
          })
        })
      );
    });

    it('should handle API failure during message handling', async () => {
      // Mock empty cache
      mockStorage.get.mockResolvedValueOnce({});

      // Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = handlers.onMessage!(
        validRequest,
        { tab: { id: 1 } },
        mockSendResponse
      );

      expect(result).toBe(true);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockConsole.error).toHaveBeenCalledWith('Failed to get price data:', expect.any(Error));
      expect(mockSendResponse).toHaveBeenCalledWith({
        requestId: 'test-request-123',
        type: 'PRICE_RESPONSE',
        status: 'error',
        error: {
          message: 'Unexpected error: Network error',
          code: 'price_fetch_error'
        },
        timestamp: Date.now()
      });
    });

    it('should handle cache failure during message handling', async () => {
      // Mock cache read failure
      mockStorage.get.mockRejectedValueOnce(new Error('Storage error'));

      const result = handlers.onMessage!(
        validRequest,
        { tab: { id: 1 } },
        mockSendResponse
      );

      expect(result).toBe(true);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockConsole.error).toHaveBeenCalledWith('Failed to get price data:', expect.any(Error));
      expect(mockSendResponse).toHaveBeenCalledWith({
        requestId: 'test-request-123',
        type: 'PRICE_RESPONSE',
        status: 'error',
        error: {
          message: 'Failed to read price cache: Storage error',
          code: 'price_fetch_error'
        },
        timestamp: Date.now()
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null message', () => {
      const result = handlers.onMessage!(
        null,
        { tab: { id: 1 } },
        vi.fn()
      );

      expect(result).toBe(false);
    });

    it('should handle non-object message', () => {
      const result = handlers.onMessage!(
        'string message',
        { tab: { id: 1 } },
        vi.fn()
      );

      expect(result).toBe(false);
    });

    it('should handle message with wrong type field', () => {
      const result = handlers.onMessage!(
        { type: 123, requestId: 'test' },
        { tab: { id: 1 } },
        vi.fn()
      );

      expect(result).toBe(false);
    });

    it('should handle concurrent alarm triggers', async () => {
      // Mock multiple API calls
      const apiResponses = [
        { bpi: { USD: { rate_float: 45000 } } },
        { bpi: { USD: { rate_float: 45100 } } }
      ];

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        const response = apiResponses[callCount++];
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => response
        });
      });

      mockStorage.set.mockResolvedValue(undefined);

      // Mock successful responses for both calls
      mockStorage.set.mockResolvedValue(undefined);

      // Trigger two alarms concurrently
      const alarm1 = handlers.onAlarm!({ name: REFRESH_ALARM_NAME });
      const alarm2 = handlers.onAlarm!({ name: REFRESH_ALARM_NAME });

      await Promise.all([alarm1, alarm2]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockStorage.set).toHaveBeenCalledTimes(2);
    });
  });
});