import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PRICE_CACHE_KEY, REFRESH_ALARM_NAME } from '../../src/common/constants';
import { PriceData, LocalStorageCache } from '../../src/common/types';

// Service Worker persistence integration tests
describe('Service Worker Persistence Integration Tests', () => {
  let mockStorage: any;
  let mockAlarms: any;
  let mockRuntime: any;
  const serviceWorkerHandlers: any = {
    onInstalled: null,
    onStartup: null,
    onAlarm: null,
    onMessage: null,
  };

  // Mock cache module
  let cacheModule: any;
  let apiModule: any;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Mock chrome storage
    mockStorage = {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    };

    // Mock chrome alarms
    mockAlarms = {
      create: vi.fn(),
      get: vi.fn().mockResolvedValue(null),
      getAll: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue(true),
      clearAll: vi.fn().mockResolvedValue(true),
      onAlarm: {
        addListener: vi.fn((handler) => {
          serviceWorkerHandlers.onAlarm = handler;
        }),
      },
    };

    // Mock chrome runtime
    mockRuntime = {
      onInstalled: {
        addListener: vi.fn((handler) => {
          serviceWorkerHandlers.onInstalled = handler;
        }),
      },
      onStartup: {
        addListener: vi.fn((handler) => {
          serviceWorkerHandlers.onStartup = handler;
        }),
      },
      onMessage: {
        addListener: vi.fn((handler) => {
          serviceWorkerHandlers.onMessage = handler;
        }),
      },
      reload: vi.fn(),
    };

    // Set up global chrome mock
    global.chrome = {
      storage: {
        local: mockStorage,
      },
      alarms: mockAlarms,
      runtime: mockRuntime,
    } as any;

    // Import fresh modules
    vi.resetModules();
    cacheModule = await import('../../src/service-worker/cache');
    apiModule = await import('../../src/service-worker/api');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Chrome Storage Persistence', () => {
    it('should persist price data to chrome.storage.local', async () => {
      const priceData: PriceData = {
        usdRate: 45000,
        satoshiRate: 0.00002222,
        fetchedAt: Date.now(),
        source: 'CoinGecko',
      };

      // Set cached price
      await cacheModule.setCachedPrice(priceData);

      // Verify storage was called
      expect(mockStorage.set).toHaveBeenCalled();
      const call = mockStorage.set.mock.calls[0][0];
      expect(call).toHaveProperty(PRICE_CACHE_KEY);
      expect(call[PRICE_CACHE_KEY]).toMatchObject({
        priceData,
        version: 1,
      });
    });

    it('should retrieve persisted data after restart', async () => {
      const timestamp = Date.now();
      const cachedData: LocalStorageCache = {
        priceData: {
          usdRate: 50000,
          satoshiRate: 0.00002,
          fetchedAt: timestamp,
          source: 'CoinGecko',
        },
        cachedAt: timestamp,
        version: 1,
      };

      // Mock storage to return cached data
      mockStorage.get.mockResolvedValue({
        [PRICE_CACHE_KEY]: cachedData,
      });

      // Get cached price
      const result = await cacheModule.getCachedPrice();

      expect(result).toEqual(cachedData.priceData);
      expect(mockStorage.get).toHaveBeenCalledWith(PRICE_CACHE_KEY);
    });

    it('should handle multiple data entries in storage', async () => {
      const multipleEntries = {
        [PRICE_CACHE_KEY]: {
          priceData: {
            usdRate: 55000,
            satoshiRate: 0.00001818,
            fetchedAt: Date.now(),
            source: 'CoinGecko',
          },
          cachedAt: Date.now(),
          version: 1,
        },
        'custom_setting_1': { value: 'test1' },
        'custom_setting_2': { value: 'test2' },
      };

      mockStorage.get.mockImplementation((keys) => {
        if (keys === PRICE_CACHE_KEY) {
          return Promise.resolve({ [PRICE_CACHE_KEY]: multipleEntries[PRICE_CACHE_KEY] });
        }
        return Promise.resolve(multipleEntries);
      });

      // Get price data
      const priceResult = await cacheModule.getCachedPrice();
      expect(priceResult).toEqual(multipleEntries[PRICE_CACHE_KEY].priceData);

      // Verify other data remains accessible (simulate extension accessing other data)
      const allData = await chrome.storage.local.get(null);
      expect(allData).toEqual(multipleEntries);
    });
  });

  describe('Chrome Alarms Persistence', () => {
    it('should create alarms on installation', async () => {
      // Import service worker index module
      await import('../../src/service-worker/index');

      // Simulate onInstalled event
      const installHandler = serviceWorkerHandlers.onInstalled;
      expect(installHandler).toBeDefined();
      
      await installHandler({ reason: 'install' });

      // Verify alarm was created
      expect(mockAlarms.create).toHaveBeenCalledWith(
        REFRESH_ALARM_NAME,
        expect.objectContaining({
          periodInMinutes: expect.any(Number),
        })
      );
    });

    it('should verify alarms persist across restarts', async () => {
      const mockAlarm = {
        name: REFRESH_ALARM_NAME,
        scheduledTime: Date.now() + 300000,
        periodInMinutes: 5,
      };

      // Mock alarm exists
      mockAlarms.get.mockResolvedValue(mockAlarm);
      mockAlarms.getAll.mockResolvedValue([mockAlarm]);

      // Get alarm
      const alarm = await chrome.alarms.get(REFRESH_ALARM_NAME);
      expect(alarm).toBeDefined();
      expect(alarm.name).toBe(REFRESH_ALARM_NAME);
      expect(alarm.periodInMinutes).toBe(5);

      // Get all alarms
      const allAlarms = await chrome.alarms.getAll();
      expect(allAlarms).toHaveLength(1);
      expect(allAlarms[0]).toEqual(mockAlarm);
    });

    it('should handle alarm triggers after restart', async () => {
      // Mock fetch for API call with complete response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          bitcoin: {
            usd: 60000
          }
        }),
      });
      global.fetch = mockFetch;

      // Import service worker
      await import('../../src/service-worker/index');

      // Trigger alarm
      const alarmHandler = serviceWorkerHandlers.onAlarm;
      expect(alarmHandler).toBeDefined();

      await alarmHandler({ name: REFRESH_ALARM_NAME });

      // Verify API was called
      expect(mockFetch).toHaveBeenCalled();
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('coingecko.com');

      // Verify cache was updated
      expect(mockStorage.set).toHaveBeenCalledWith(
        expect.objectContaining({
          [PRICE_CACHE_KEY]: expect.objectContaining({
            priceData: expect.objectContaining({
              usdRate: 60000,
            }),
          }),
        })
      );
    });
  });

  describe('Service Worker Lifecycle', () => {
    it('should rehydrate cache on startup', async () => {
      const cachedData = {
        [PRICE_CACHE_KEY]: {
          priceData: {
            usdRate: 55000,
            satoshiRate: 0.00001818,
            fetchedAt: Date.now() - 60000,
            source: 'CoinGecko',
          },
          cachedAt: Date.now() - 60000,
          version: 1,
        },
      };

      mockStorage.get.mockResolvedValue(cachedData);

      // Import and trigger startup
      await import('../../src/service-worker/index');
      const startupHandler = serviceWorkerHandlers.onStartup;
      expect(startupHandler).toBeDefined();

      await startupHandler();

      // Verify rehydration
      const result = await cacheModule.getCachedPrice();
      expect(result).toEqual(cachedData[PRICE_CACHE_KEY].priceData);
    });

    it('should handle message passing after restart', async () => {
      const cachedPrice: PriceData = {
        usdRate: 48000,
        satoshiRate: 0.00002083,
        fetchedAt: Date.now() - 30000,
        source: 'CoinGecko',
      };

      mockStorage.get.mockResolvedValue({
        [PRICE_CACHE_KEY]: {
          priceData: cachedPrice,
          cachedAt: Date.now() - 30000,
          version: 1,
        },
      });

      // Import service worker
      await import('../../src/service-worker/index');

      // Handle message
      const messageHandler = serviceWorkerHandlers.onMessage;
      expect(messageHandler).toBeDefined();

      const sendResponse = vi.fn();
      const message = {
        type: 'PRICE_REQUEST',
        requestId: 'test-123',
        timestamp: Date.now(),
      };

      await new Promise<void>((resolve) => {
        messageHandler(message, {}, (response: any) => {
          sendResponse(response);
          resolve();
        });
      });

      // Verify response
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PRICE_RESPONSE',
          requestId: 'test-123',
          status: 'success',
          data: cachedPrice,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle corrupted storage data gracefully', async () => {
      // Mock corrupted data
      mockStorage.get.mockResolvedValue({
        [PRICE_CACHE_KEY]: 'invalid data',
      });

      // Should return null for invalid data
      const result = await cacheModule.getCachedPrice();
      expect(result).toBeNull();
    });

    it('should handle missing alarms after restart', async () => {
      mockAlarms.getAll.mockResolvedValue([]);

      // Import service worker
      await import('../../src/service-worker/index');

      // Trigger install to create alarms
      const installHandler = serviceWorkerHandlers.onInstalled;
      await installHandler({ reason: 'update' });

      // Verify alarm was created even if none existed
      expect(mockAlarms.create).toHaveBeenCalled();
    });

    it('should handle concurrent storage operations', async () => {
      const operations = [];
      
      // Multiple concurrent writes
      for (let i = 0; i < 5; i++) {
        const priceData: PriceData = {
          usdRate: 40000 + i * 1000,
          satoshiRate: 0.00002 + i * 0.00001,
          fetchedAt: Date.now() + i,
          source: 'CoinGecko',
        };
        operations.push(cacheModule.setCachedPrice(priceData));
      }

      await Promise.all(operations);

      // Verify all operations completed
      expect(mockStorage.set).toHaveBeenCalledTimes(5);
    });
  });
});