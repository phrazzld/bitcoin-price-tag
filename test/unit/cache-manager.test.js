/**
 * Unit tests for cache manager module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CACHE_KEYS,
  CACHE_FRESHNESS,
  CACHE_TTL,
  determineCacheFreshness,
  calculateCacheTTL,
  calculatePriceVolatility,
  shouldRefreshCache,
  isOffline
} from '../../cache-manager.js';

describe('Cache Manager Utilities', () => {
  describe('determineCacheFreshness', () => {
    it('should return FRESH for recent cache entries', () => {
      // Mock current time
      const now = Date.now();
      const fourMinutesAgo = now - 4 * 60 * 1000;
      
      expect(determineCacheFreshness(fourMinutesAgo)).toBe(CACHE_FRESHNESS.FRESH);
    });

    it('should return STALE for older cache entries', () => {
      const now = Date.now();
      const thirtyMinutesAgo = now - 30 * 60 * 1000;
      
      expect(determineCacheFreshness(thirtyMinutesAgo)).toBe(CACHE_FRESHNESS.STALE);
    });

    it('should return VERY_STALE for very old cache entries', () => {
      const now = Date.now();
      const twelveHoursAgo = now - 12 * 60 * 60 * 1000;
      
      expect(determineCacheFreshness(twelveHoursAgo)).toBe(CACHE_FRESHNESS.VERY_STALE);
    });

    it('should return EXPIRED for expired cache entries', () => {
      const now = Date.now();
      const twosDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
      
      expect(determineCacheFreshness(twosDaysAgo)).toBe(CACHE_FRESHNESS.EXPIRED);
    });

    it('should return EXPIRED for null or undefined timestamps', () => {
      expect(determineCacheFreshness(null)).toBe(CACHE_FRESHNESS.EXPIRED);
      expect(determineCacheFreshness(undefined)).toBe(CACHE_FRESHNESS.EXPIRED);
    });
  });

  describe('shouldRefreshCache', () => {
    it('should indicate immediate refresh for null cache', () => {
      const result = shouldRefreshCache(null);
      
      expect(result.shouldRefresh).toBe(true);
      expect(result.immediately).toBe(true);
      expect(result.reason).toBe('no_cache');
    });

    it('should not refresh fresh cache', () => {
      const now = Date.now();
      const freshCache = {
        timestamp: now - 1 * 60 * 1000,
        freshness: CACHE_FRESHNESS.FRESH
      };
      
      const result = shouldRefreshCache(freshCache);
      
      expect(result.shouldRefresh).toBe(false);
      expect(result.immediately).toBe(false);
      expect(result.reason).toBe('cache_fresh');
    });

    it('should refresh stale cache in background', () => {
      const now = Date.now();
      const staleCache = {
        timestamp: now - 30 * 60 * 1000,
        freshness: CACHE_FRESHNESS.STALE
      };
      
      const result = shouldRefreshCache(staleCache);
      
      expect(result.shouldRefresh).toBe(true);
      expect(result.immediately).toBe(false);
      expect(result.reason).toBe('cache_stale');
    });

    it('should refresh very stale cache immediately', () => {
      const now = Date.now();
      const veryStaleCache = {
        timestamp: now - 12 * 60 * 60 * 1000,
        freshness: CACHE_FRESHNESS.VERY_STALE
      };
      
      const result = shouldRefreshCache(veryStaleCache);
      
      expect(result.shouldRefresh).toBe(true);
      expect(result.immediately).toBe(true);
      expect(result.reason).toBe('cache_very_stale');
    });

    it('should refresh expired cache immediately', () => {
      const now = Date.now();
      const expiredCache = {
        timestamp: now - 2 * 24 * 60 * 60 * 1000,
        freshness: CACHE_FRESHNESS.EXPIRED
      };
      
      const result = shouldRefreshCache(expiredCache);
      
      expect(result.shouldRefresh).toBe(true);
      expect(result.immediately).toBe(true);
      expect(result.reason).toBe('cache_expired');
    });

    it('should calculate freshness if not provided', () => {
      const now = Date.now();
      const freshCache = {
        timestamp: now - 1 * 60 * 1000 // Fresh, but no freshness property
      };
      
      const result = shouldRefreshCache(freshCache);
      
      expect(result.shouldRefresh).toBe(false);
      expect(result.immediately).toBe(false);
    });
  });

  describe('calculateCacheTTL', () => {
    it('should return base TTL for average volatility', () => {
      const ttl = calculateCacheTTL(0.5);
      expect(ttl).toBe(CACHE_TTL.FRESH * 1.5);
    });

    it('should return shorter TTL for high volatility', () => {
      const ttl = calculateCacheTTL(1.0);
      expect(ttl).toBe(CACHE_TTL.FRESH * 1.0);
    });

    it('should return longer TTL for low volatility', () => {
      const ttl = calculateCacheTTL(0.0);
      expect(ttl).toBe(CACHE_TTL.FRESH * 2.0);
    });

    it('should handle out of range volatility values', () => {
      // Should clamp to valid range (0-1)
      expect(calculateCacheTTL(1.5)).toBe(CACHE_TTL.FRESH * 1.0);
      expect(calculateCacheTTL(-0.5)).toBe(CACHE_TTL.FRESH * 2.0);
    });

    it('should use default volatility if none provided', () => {
      expect(calculateCacheTTL()).toBe(CACHE_TTL.FRESH * 2.0);
    });
  });

  describe('calculatePriceVolatility', () => {
    it('should calculate volatility based on price changes', () => {
      const oldData = {
        btcPrice: 50000,
        timestamp: Date.now() - 60 * 60 * 1000 // 1 hour ago
      };
      
      // 5% price change in 1 hour (normalized to 0-1 scale) = 0.5 volatility
      const newData = {
        btcPrice: 52500, // 5% increase
        timestamp: Date.now()
      };
      
      const volatility = calculatePriceVolatility(newData, oldData);
      expect(volatility).toBeCloseTo(0.5, 1);
    });

    it('should handle large price changes', () => {
      const oldData = {
        btcPrice: 50000,
        timestamp: Date.now() - 60 * 60 * 1000 // 1 hour ago
      };
      
      // 20% price change in 1 hour should cap at 1.0 volatility
      const newData = {
        btcPrice: 60000, // 20% increase
        timestamp: Date.now()
      };
      
      const volatility = calculatePriceVolatility(newData, oldData);
      expect(volatility).toBe(1);
    });

    it('should adjust for time difference', () => {
      const oldData = {
        btcPrice: 50000,
        timestamp: Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
      };
      
      // 10% price change over 2 hours = 0.5 volatility
      const newData = {
        btcPrice: 55000, // 10% increase
        timestamp: Date.now()
      };
      
      const volatility = calculatePriceVolatility(newData, oldData);
      expect(volatility).toBeCloseTo(0.5, 1);
    });

    it('should return 0 for invalid inputs', () => {
      expect(calculatePriceVolatility(null, null)).toBe(0);
      expect(calculatePriceVolatility({}, {})).toBe(0);
      expect(calculatePriceVolatility({ btcPrice: 50000 }, null)).toBe(0);
    });

    it('should handle very small time differences', () => {
      const oldData = {
        btcPrice: 50000,
        timestamp: Date.now() - 100 // Just 100ms ago
      };
      
      const newData = {
        btcPrice: 50100, // Slight change
        timestamp: Date.now()
      };
      
      // Should not divide by zero or tiny numbers
      const volatility = calculatePriceVolatility(newData, oldData);
      expect(volatility).toBe(0);
    });
  });

  describe('isOffline', () => {
    let originalNavigator;

    beforeEach(() => {
      // Store original navigator
      originalNavigator = global.navigator;
    });

    afterEach(() => {
      // Restore original navigator
      global.navigator = originalNavigator;
    });

    it('should detect offline status', () => {
      // Mock navigator.onLine = false
      global.navigator = { onLine: false };
      
      expect(isOffline()).toBe(true);
    });

    it('should detect online status', () => {
      // Mock navigator.onLine = true
      global.navigator = { onLine: true };
      
      expect(isOffline()).toBe(false);
    });

    it('should handle missing navigator', () => {
      // Remove navigator to simulate environments where it's not available
      global.navigator = undefined;
      
      expect(isOffline()).toBe(false);
    });
  });
});