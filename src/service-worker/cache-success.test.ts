/**
 * Simplified test for service worker cache functionality
 * This test focuses specifically on the un-skipped test from CR-02
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PriceRequestMessage, PriceData } from '../common/types';
import { PRICE_CACHE_KEY } from '../common/constants';

// Create mock functions
const mockSendResponse = vi.fn();
const mockFetch = vi.fn();

// Set up test data
const validCachedData: PriceData = {
  usdRate: 45000,
  satoshiRate: 0.00045,
  fetchedAt: Date.now() - 5000,
  source: 'CoinGecko'
};

const validRequest: PriceRequestMessage = {
  type: 'PRICE_REQUEST',
  requestId: 'test-request-123',
  timestamp: Date.now()
};

describe('Service Worker Cache Test', () => {
  // Setup required mocks
  beforeEach(() => {
    // Setup mock chrome.storage.local
    global.chrome = {
      runtime: {
        onMessage: { addListener: vi.fn() },
        onInstalled: { addListener: vi.fn() },
        onStartup: { addListener: vi.fn() }
      },
      alarms: {
        create: vi.fn(),
        clear: vi.fn(),
        onAlarm: { addListener: vi.fn() }
      },
      storage: {
        local: {
          get: vi.fn().mockImplementation((key) => {
            if (key === PRICE_CACHE_KEY) {
              return Promise.resolve({
                [PRICE_CACHE_KEY]: {
                  priceData: validCachedData,
                  cachedAt: Date.now() - 5000,
                  version: 1
                }
              });
            }
            return Promise.resolve({});
          }),
          set: vi.fn().mockResolvedValue(undefined),
          remove: vi.fn().mockResolvedValue(undefined)
        }
      }
    } as any;

    // Mock fetch to confirm it's not called
    global.fetch = mockFetch;

    // Clear all mocks
    vi.clearAllMocks();
    
    // Setup fake timers
    vi.useFakeTimers({ shouldAdvanceTime: true });
    
    // Mock Date.now
    vi.spyOn(Date, 'now').mockReturnValue(1734447415000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns cached price data without API call when cache is available', async () => {
    // Import the service worker module fresh each time
    vi.resetModules();
    const serviceWorkerModule = await import('./index');
    
    // Find the message handler
    const onMessageHandler = (chrome.runtime.onMessage.addListener as any).mock.calls[0][0];
    
    // Call the handler
    const result = onMessageHandler(
      validRequest,
      { tab: { id: 1 } },
      mockSendResponse
    );
    
    // Verify it returns true (for async handling)
    expect(result).toBe(true);
    
    // Wait for all async operations to complete
    await vi.runAllTimersAsync();
    
    // Verify that the chrome.storage.local.get was called with the cache key
    expect(chrome.storage.local.get).toHaveBeenCalledWith(PRICE_CACHE_KEY);
    
    // Verify fetch was not called (important test - we should use cache)
    expect(mockFetch).not.toHaveBeenCalled();
    
    // Verify the sendResponse was called with the cached data
    expect(mockSendResponse).toHaveBeenCalledTimes(1);
    expect(mockSendResponse).toHaveBeenCalledWith({
      requestId: validRequest.requestId,
      type: 'PRICE_RESPONSE',
      status: 'success',
      data: validCachedData,
      timestamp: expect.any(Number)
    });
  });
});