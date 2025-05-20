import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PriceData, PriceRequestMessage } from '../common/types';
import { REFRESH_ALARM_NAME, DEFAULT_CACHE_TTL_MS } from '../common/constants';

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

// Set up global chrome mock
global.chrome = mockChrome as any;

// Mock for chrome.storage.local
const mockStorage = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn()
};

// Mock fetch for api.ts
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

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
    // Clear all mocks
    vi.clearAllMocks();
    mockStorage.get.mockReset();
    mockStorage.set.mockReset();
    mockFetch.mockReset();
    mockSendResponse.mockReset();
    
    // Set up fake timers
    vi.useFakeTimers();
    
    // Reset chrome storage mock
    global.chrome.storage = {
      local: mockStorage
    } as any;
    
    // Mock Date.now for consistent timestamps
    vi.spyOn(Date, 'now').mockReturnValue(1734447415000);
    
    // Reset modules and reimport
    vi.resetModules();
    global.fetch = mockFetch as any;
    
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
    vi.restoreAllMocks();
    vi.useRealTimers();
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