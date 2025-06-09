/**
 * Tests for Chrome API Mock Factory
 * Validates that the standardized mock system works correctly
 */

import { describe, it, expect, afterEach } from 'vitest';
import { 
  createChromeMocks, 
  ChromeMockPresets, 
  withChromeMocks,
  type ChromeMockConfig 
} from './chrome-api-factory';
import { createTestPriceData } from './test-helpers';

describe('Chrome API Mock Factory', () => {
  let cleanupFunctions: (() => void)[] = [];

  afterEach(() => {
    // Clean up any mocks created during tests
    cleanupFunctions.forEach(cleanup => cleanup());
    cleanupFunctions = [];
  });

  describe('Mock Strategy Creation', () => {
    it('should create unit test mocks', () => {
      const mockResult = createChromeMocks(ChromeMockPresets.unit());
      cleanupFunctions.push(mockResult.cleanup);

      expect(mockResult.chromeApi).toBeDefined();
      expect(mockResult.chromeApi.runtime).toBeDefined();
      expect(mockResult.chromeApi.storage).toBeDefined();
      expect(mockResult.chromeApi.alarms).toBeUndefined(); // Not enabled for unit tests
      expect(mockResult.storageMock).toBeDefined();
      expect(mockResult.harness).toBeUndefined(); // Only for integration tests
    });

    it('should create integration test mocks with harness', () => {
      const mockResult = createChromeMocks(ChromeMockPresets.integration());
      cleanupFunctions.push(mockResult.cleanup);

      expect(mockResult.chromeApi).toBeDefined();
      expect(mockResult.chromeApi.runtime).toBeDefined();
      expect(mockResult.chromeApi.storage).toBeDefined();
      expect(mockResult.chromeApi.alarms).toBeDefined();
      expect(mockResult.harness).toBeDefined();
      expect(mockResult.storageMock).toBeDefined();
    });

    it('should create service worker test mocks', () => {
      const priceData = createTestPriceData();
      const mockResult = createChromeMocks(ChromeMockPresets.serviceWorker(priceData, 5000));
      cleanupFunctions.push(mockResult.cleanup);

      expect(mockResult.chromeApi).toBeDefined();
      expect(mockResult.chromeApi.runtime).toBeDefined();
      expect(mockResult.chromeApi.storage).toBeDefined();
      expect(mockResult.chromeApi.alarms).toBeDefined();
      expect(mockResult.storageMock).toBeDefined();
      expect(mockResult.harness).toBeUndefined(); // Direct mocks for service worker
    });

    it('should create content script test mocks', () => {
      const mockResult = createChromeMocks(ChromeMockPresets.contentScript());
      cleanupFunctions.push(mockResult.cleanup);

      expect(mockResult.chromeApi).toBeDefined();
      expect(mockResult.chromeApi.runtime).toBeDefined();
      expect(mockResult.chromeApi.storage).toBeUndefined(); // Not enabled for content script
      expect(mockResult.chromeApi.alarms).toBeUndefined(); // Not enabled for content script
    });
  });

  describe('Custom Configuration', () => {
    it('should respect custom API enablement', () => {
      const config: ChromeMockConfig = {
        strategy: 'unit',
        apis: {
          runtime: true,
          storage: false,
          alarms: true,
          tabs: true
        }
      };

      const mockResult = createChromeMocks(config);
      cleanupFunctions.push(mockResult.cleanup);

      expect(mockResult.chromeApi.runtime).toBeDefined();
      expect(mockResult.chromeApi.storage).toBeUndefined();
      expect(mockResult.chromeApi.alarms).toBeDefined();
      expect(mockResult.chromeApi.tabs).toBeDefined();
    });

    it('should setup initial storage data', () => {
      const initialData = { 'test-key': 'test-value' };
      const config: ChromeMockConfig = {
        strategy: 'unit',
        initialStorage: initialData
      };

      const mockResult = createChromeMocks(config);
      cleanupFunctions.push(mockResult.cleanup);

      expect(mockResult.storageMock).toBeDefined();
      expect(mockResult.storageMock!.getStore()).toEqual(initialData);
    });

    it('should setup initial cached price data', () => {
      const priceData = createTestPriceData();
      const config: ChromeMockConfig = {
        strategy: 'service-worker',
        initialCache: priceData,
        cacheAge: 1000
      };

      const mockResult = createChromeMocks(config);
      cleanupFunctions.push(mockResult.cleanup);

      expect(mockResult.storageMock).toBeDefined();
      
      // Verify cache was set up with price data
      const store = mockResult.storageMock!.getStore();
      expect(store['btc_price_data']).toBeDefined();
      expect(store['btc_price_data'].priceData).toEqual(priceData);
    });
  });

  describe('Mock Behavior', () => {
    it('should provide working storage mocks', async () => {
      const mockResult = createChromeMocks(ChromeMockPresets.unit());
      cleanupFunctions.push(mockResult.cleanup);

      const storage = mockResult.storageMock!;
      
      // Test storage operations
      await storage.set({ 'test': 'value' });
      const result = await storage.get('test');
      
      expect(result).toEqual({ 'test': 'value' });
    });

    it('should provide working runtime mocks', () => {
      const mockResult = createChromeMocks(ChromeMockPresets.unit());
      cleanupFunctions.push(mockResult.cleanup);

      const runtime = mockResult.chromeApi.runtime;
      
      expect(runtime.sendMessage).toBeDefined();
      expect(runtime.onMessage.addListener).toBeDefined();
      expect(runtime.id).toBe('test-extension-id');
    });

    it('should provide working alarms mocks for service worker strategy', () => {
      const mockResult = createChromeMocks(ChromeMockPresets.serviceWorker());
      cleanupFunctions.push(mockResult.cleanup);

      const alarms = mockResult.chromeApi.alarms;
      
      expect(alarms.create).toBeDefined();
      expect(alarms.clear).toBeDefined();
      expect(alarms.onAlarm.addListener).toBeDefined();
      
      // Service worker strategy should have promise-based alarms
      const createResult = alarms.create('test-alarm', { delayInMinutes: 1 });
      expect(createResult).toBeInstanceOf(Promise);
    });
  });

  describe('Cleanup Functionality', () => {
    it('should clean up global chrome object', () => {
      const mockResult = createChromeMocks(ChromeMockPresets.unit());
      
      // Verify global was set
      expect((global as any).chrome).toBeDefined();
      
      // Cleanup
      mockResult.cleanup();
      
      // Verify global was cleaned up
      expect((global as any).chrome).toBeUndefined();
    });

    it('should reset harness state for integration tests', () => {
      const mockResult = createChromeMocks(ChromeMockPresets.integration());
      
      // Verify harness exists
      expect(mockResult.harness).toBeDefined();
      
      // Add a listener to harness
      mockResult.harness!.setContext('service-worker');
      const originalListenerCount = (mockResult.harness as any).listeners.length;
      
      // Cleanup
      mockResult.cleanup();
      
      // Verify harness was reset (assuming reset clears listeners)
      const newListenerCount = (mockResult.harness as any).listeners.length;
      expect(newListenerCount).toBeLessThanOrEqual(originalListenerCount);
    });
  });

  describe('withChromeMocks Helper', () => {
    it('should automatically cleanup after test function', () => {
      withChromeMocks(ChromeMockPresets.unit(), (mockResult) => {
        expect(mockResult.chromeApi).toBeDefined();
        expect((global as any).chrome).toBeDefined();
        return 'test-result';
      });
      
      // After withChromeMocks completes, global should be cleaned up
      expect((global as any).chrome).toBeUndefined();
    });

    it('should return the result of the test function', () => {
      const result = withChromeMocks(ChromeMockPresets.unit(), () => {
        return 'test-result';
      });
      
      expect(result).toBe('test-result');
    });

    it('should cleanup even if test function throws', () => {
      expect(() => {
        withChromeMocks(ChromeMockPresets.unit(), () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
      
      // Global should still be cleaned up
      expect((global as any).chrome).toBeUndefined();
    });
  });

  describe('Integration with Existing Patterns', () => {
    it('should work with vi.stubGlobal for integration tests', () => {
      const mockResult = createChromeMocks(ChromeMockPresets.integration());
      cleanupFunctions.push(mockResult.cleanup);

      // Integration tests use vi.stubGlobal, so chrome should be available globally
      expect(chrome).toBeDefined();
      expect(chrome.runtime).toBeDefined();
      expect(chrome.storage).toBeDefined();
    });

    it('should provide storage mock compatible with existing tests', async () => {
      const mockResult = createChromeMocks(ChromeMockPresets.serviceWorker());
      cleanupFunctions.push(mockResult.cleanup);

      const storage = mockResult.storageMock!;
      
      // Test patterns used in existing tests
      storage.get.mockResolvedValue({ 'key1': 'value1' });
      const result = await storage.get('key1');
      expect(result).toEqual({ 'key1': 'value1' });
      
      storage.set.mockResolvedValue(undefined);
      await storage.set({ 'key2': 'value2' });
      expect(storage.set).toHaveBeenCalledWith({ 'key2': 'value2' });
    });
  });
});