import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ErrorTypes, createError, withTimeout, withRetry } from '../../error-handling.js';

// Import functions to test - they're mostly in background.js which requires mocking Chrome APIs
// So we'll test the underlying utility functions in error-handling.js first

describe('Fallback Mechanisms', () => {
  // Test timeout functionality
  describe('withTimeout', () => {
    it('should resolve when promise resolves before timeout', async () => {
      const result = await withTimeout(Promise.resolve('success'), 100);
      expect(result).toBe('success');
    });

    it('should reject with timeout error when promise takes too long', async () => {
      const slowPromise = new Promise((resolve) => setTimeout(() => resolve('too late'), 200));

      await expect(withTimeout(slowPromise, 50, 'Timed out')).rejects.toThrow('Timed out');
      await expect(withTimeout(slowPromise, 50, 'Timed out')).rejects.toMatchObject({
        type: ErrorTypes.TIMEOUT,
      });
    });
  });

  // Test retry functionality
  describe('withRetry', () => {
    // Mock the setTimeout to execute immediately
    beforeEach(() => {
      vi.spyOn(global, 'setTimeout').mockImplementation((fn) => {
        fn(); // Execute callback immediately
        return 1; // Return a timeout ID
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should retry failed operations', async () => {
      const mockFn = vi.fn();
      // Fail twice, succeed on third try
      mockFn
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(mockFn, { retries: 2, initialBackoff: 10 });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should eventually fail after all retries are exhausted', async () => {
      const mockFn = vi.fn();
      mockFn.mockRejectedValue(new Error('Always fail'));

      await expect(withRetry(mockFn, { retries: 2, initialBackoff: 10 })).rejects.toThrow(
        'Always fail',
      );

      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should respect the shouldRetry option', async () => {
      const mockFn = vi.fn();
      // Error that shouldn't be retried
      const parsingError = createError('Parsing error', ErrorTypes.PARSING);
      mockFn.mockRejectedValue(parsingError);

      await expect(
        withRetry(mockFn, {
          retries: 3,
          initialBackoff: 10,
          shouldRetry: (error) => error.type !== ErrorTypes.PARSING,
        }),
      ).rejects.toThrow('Parsing error');

      expect(mockFn).toHaveBeenCalledTimes(1); // No retries for parsing errors
    });
  });

  // Mock tests for higher-level fallback mechanisms
  describe('Higher-level Fallback Functions (Mock Tests)', () => {
    // Mock for localStorage
    const localStorageMock = (() => {
      let store = {};
      return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
          store[key] = value.toString();
        }),
        clear: vi.fn(() => {
          store = {};
        }),
      };
    })();

    // Replace window.localStorage with mock
    const originalLocalStorage = global.localStorage;

    beforeEach(() => {
      global.localStorage = localStorageMock;
      localStorageMock.clear();
    });

    afterEach(() => {
      global.localStorage = originalLocalStorage;
    });

    // Test local cache functionality by creating a minimal version of content.js functions
    it('should retrieve data from local cache when available', () => {
      const mockPriceData = {
        btcPrice: 45000,
        satPrice: 0.00045,
        timestamp: Date.now() - 1000 * 60 * 10, // 10 minutes ago
        source: 'test',
      };

      // Store data in mock localStorage
      localStorageMock.setItem('btcPriceTagLocalCache', JSON.stringify(mockPriceData));

      // Minimal implementation of getLocalCachedPriceData
      const getLocalCachedPriceData = () => {
        try {
          const cachedData = localStorage.getItem('btcPriceTagLocalCache');
          if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            return {
              ...parsedData,
              fromLocalCache: true,
              localCacheAge: Date.now() - parsedData.timestamp,
            };
          }
          return null;
        } catch (/* eslint-disable-line no-unused-vars */ _error) {
          return null;
        }
      };

      const result = getLocalCachedPriceData();

      expect(result).toBeTruthy();
      expect(result.btcPrice).toBe(45000);
      expect(result.fromLocalCache).toBe(true);
      expect(result.localCacheAge).toBeGreaterThan(0);
    });

    it('should create emergency fallback data when all else fails', () => {
      // Minimal implementation of createEmergencyPriceData
      const createEmergencyPriceData = () => {
        // These are rough estimates used only when all retrieval methods fail
        const estimatedPrice = 50000;
        return {
          btcPrice: estimatedPrice,
          satPrice: 0.0005, // Simplified for test
          timestamp: Date.now(),
          isEmergencyFallback: true,
          source: 'emergency_fallback',
          warning: 'Using estimated price - could not retrieve actual data',
        };
      };

      const result = createEmergencyPriceData();

      expect(result).toBeTruthy();
      expect(result.btcPrice).toBe(50000);
      expect(result.isEmergencyFallback).toBe(true);
      expect(result.warning).toContain('Using estimated price');
    });
  });
});
