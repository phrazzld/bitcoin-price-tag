import { describe, it, expect } from 'vitest';
import { CacheError, CacheErrorCode, createCacheError } from './cache-error';
import { BaseError } from './base-error';

describe('CacheError', () => {
  describe('constructor', () => {
    it('should create cache error with required properties', () => {
      const error = new CacheError(
        CacheErrorCode.READ_ERROR,
        'Failed to read from cache'
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(CacheError);
      expect(error.name).toBe('CacheError');
      expect(error.code).toBe('READ_ERROR');
      expect(error.message).toBe('Failed to read from cache');
    });

    it('should create cache error with storage context', () => {
      const error = new CacheError(
        CacheErrorCode.WRITE_ERROR,
        'Failed to write to cache',
        {
          context: {
            key: 'btc_price_data',
            storageType: 'local',
            operation: 'set',
            dataSize: 2048
          }
        }
      );
      
      expect(error.context?.key).toBe('btc_price_data');
      expect(error.context?.storageType).toBe('local');
      expect(error.context?.operation).toBe('set');
      expect(error.context?.dataSize).toBe(2048);
    });

    it('should create cache error with quota context', () => {
      const error = new CacheError(
        CacheErrorCode.QUOTA_EXCEEDED,
        'Storage quota exceeded',
        {
          context: {
            storageType: 'local',
            quotaBytes: 5242880,
            usedBytes: 5240000,
            requestedBytes: 10000
          }
        }
      );
      
      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.context?.quotaBytes).toBe(5242880);
      expect(error.context?.usedBytes).toBe(5240000);
    });
  });

  describe('error codes', () => {
    it('should have all expected error codes', () => {
      expect(CacheErrorCode.READ_ERROR).toBe('READ_ERROR');
      expect(CacheErrorCode.WRITE_ERROR).toBe('WRITE_ERROR');
      expect(CacheErrorCode.INVALID_DATA).toBe('INVALID_DATA');
      expect(CacheErrorCode.QUOTA_EXCEEDED).toBe('QUOTA_EXCEEDED');
      expect(CacheErrorCode.EXPIRED_DATA).toBe('EXPIRED_DATA');
    });
  });

  describe('helper methods', () => {
    it('should check if error is storage quota related', () => {
      const quotaError = new CacheError(
        CacheErrorCode.QUOTA_EXCEEDED,
        'Storage full'
      );
      const readError = new CacheError(
        CacheErrorCode.READ_ERROR,
        'Read failed'
      );
      
      expect(quotaError.isQuotaError()).toBe(true);
      expect(readError.isQuotaError()).toBe(false);
    });

    it('should get storage key from context', () => {
      const error = new CacheError(
        CacheErrorCode.WRITE_ERROR,
        'Write failed',
        {
          context: { key: 'user_preferences' }
        }
      );
      
      expect(error.getStorageKey()).toBe('user_preferences');
    });

    it('should return undefined when no key in context', () => {
      const error = new CacheError(
        CacheErrorCode.QUOTA_EXCEEDED,
        'Quota exceeded'
      );
      
      expect(error.getStorageKey()).toBeUndefined();
    });
  });

  describe('createCacheError factory', () => {
    it('should create error from Chrome storage error', () => {
      const chromeError = new Error('Failed to get data');
      const error = createCacheError(chromeError, {
        operation: 'get',
        key: 'price_data',
        storageType: 'local'
      });
      
      expect(error).toBeInstanceOf(CacheError);
      expect(error.code).toBe('READ_ERROR');
      expect(error.cause).toBe(chromeError);
      expect(error.context?.operation).toBe('get');
    });

    it('should detect quota errors', () => {
      const quotaError = new Error('Quota exceeded');
      const error = createCacheError(quotaError, {
        operation: 'set',
        dataSize: 10000
      });
      
      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.context?.dataSize).toBe(10000);
    });

    it('should create invalid data error', () => {
      const error = createCacheError(new Error('Corrupted data'), {
        operation: 'get',
        key: 'cache_entry',
        reason: 'JSON parse failed'
      });
      
      expect(error.code).toBe('INVALID_DATA');
      expect(error.context?.reason).toBe('JSON parse failed');
    });
  });

  describe('cache validation context', () => {
    it('should include validation details for invalid data', () => {
      const error = new CacheError(
        CacheErrorCode.INVALID_DATA,
        'Cache data validation failed',
        {
          context: {
            key: 'btc_price',
            expectedVersion: 2,
            actualVersion: 1,
            validationErrors: [
              'Missing required field: satoshiRate',
              'Invalid timestamp format'
            ]
          }
        }
      );
      
      expect(error.context?.expectedVersion).toBe(2);
      expect(error.context?.actualVersion).toBe(1);
      expect(error.context?.validationErrors).toHaveLength(2);
    });
  });

  describe('serialization', () => {
    it('should serialize with cache-specific context', () => {
      const error = new CacheError(
        CacheErrorCode.EXPIRED_DATA,
        'Cache data expired',
        {
          context: {
            key: 'price_data',
            expirationTime: '2024-01-01T00:00:00.000Z',
            currentTime: '2024-01-02T00:00:00.000Z',
            ttl: 86400000 // 24 hours
          },
          correlationId: 'cache_check_123'
        }
      );
      
      const json = error.toJSON();
      
      expect(json.name).toBe('CacheError');
      expect(json.code).toBe('EXPIRED_DATA');
      expect(json.context).toMatchObject({
        key: 'price_data',
        ttl: 86400000
      });
      expect(json.correlationId).toBe('cache_check_123');
    });
  });
});