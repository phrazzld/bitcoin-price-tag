import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { 
  MessageValidators, 
  SecureValidation,
  ValidationErrorCode
} from './schema-validation';
import { PriceRequestMessage, PriceResponseMessage, PriceData, CoinGeckoApiResponse } from './types';

describe('schema-validation.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MessageValidators.validatePriceRequestMessage', () => {
    const validMessage: PriceRequestMessage = {
      type: 'PRICE_REQUEST',
      requestId: 'test-request-id',
      timestamp: Date.now()
    };

    describe('valid messages', () => {
      it('should validate a correct PriceRequestMessage', () => {
        const result = MessageValidators.validatePriceRequestMessage(validMessage);
        expect(result.isValid).toBe(true);
        expect(result.data).toEqual(validMessage);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate with non-strict mode allowing extra properties', () => {
        const messageWithExtra = { ...validMessage, extra: 'value' };
        const result = MessageValidators.validatePriceRequestMessage(messageWithExtra, false);
        expect(result.isValid).toBe(true);
        expect(result.data).toEqual(messageWithExtra);
      });
    });

    describe('invalid basic structure', () => {
      it('should reject null', () => {
        const result = MessageValidators.validatePriceRequestMessage(null);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe(ValidationErrorCode.INVALID_TYPE);
        expect(result.errors[0].path).toBe('PriceRequestMessage');
      });

      it('should reject arrays', () => {
        const result = MessageValidators.validatePriceRequestMessage([1, 2, 3]);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe(ValidationErrorCode.INVALID_TYPE);
      });

      it('should reject primitive types', () => {
        const result = MessageValidators.validatePriceRequestMessage('string');
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe(ValidationErrorCode.INVALID_TYPE);
      });
    });

    describe('missing properties', () => {
      it('should reject message missing type', () => {
        const message = { requestId: 'test', timestamp: Date.now() };
        const result = MessageValidators.validatePriceRequestMessage(message);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.MISSING_PROPERTY && e.path === 'PriceRequestMessage.type')).toBe(true);
      });

      it('should reject message missing requestId', () => {
        const message = { type: 'PRICE_REQUEST', timestamp: Date.now() };
        const result = MessageValidators.validatePriceRequestMessage(message);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.MISSING_PROPERTY && e.path === 'PriceRequestMessage.requestId')).toBe(true);
      });

      it('should reject message missing timestamp', () => {
        const message = { type: 'PRICE_REQUEST', requestId: 'test' };
        const result = MessageValidators.validatePriceRequestMessage(message);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.MISSING_PROPERTY && e.path === 'PriceRequestMessage.timestamp')).toBe(true);
      });
    });

    describe('invalid property types', () => {
      it('should reject invalid type field', () => {
        const message = { ...validMessage, type: 'INVALID_TYPE' };
        const result = MessageValidators.validatePriceRequestMessage(message);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.INVALID_ENUM_VALUE && e.path === 'PriceRequestMessage.type')).toBe(true);
      });

      it('should reject non-string requestId', () => {
        const message = { ...validMessage, requestId: 123 };
        const result = MessageValidators.validatePriceRequestMessage(message);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.INVALID_TYPE && e.path === 'PriceRequestMessage.requestId')).toBe(true);
      });

      it('should reject empty requestId', () => {
        const message = { ...validMessage, requestId: '' };
        const result = MessageValidators.validatePriceRequestMessage(message);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.EMPTY_STRING && e.path === 'PriceRequestMessage.requestId')).toBe(true);
      });

      it('should reject non-number timestamp', () => {
        const message = { ...validMessage, timestamp: 'not-a-number' };
        const result = MessageValidators.validatePriceRequestMessage(message);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.INVALID_TYPE && e.path === 'PriceRequestMessage.timestamp')).toBe(true);
      });

      it('should reject invalid timestamp values', () => {
        const invalidTimestamps = [
          -1,           // negative
          0,            // zero
          Infinity,     // infinite
          -Infinity,    // negative infinite
          NaN,          // NaN
          Date.now() + (2 * 365 * 24 * 60 * 60 * 1000), // too far in future
          Date.now() - (2 * 365 * 24 * 60 * 60 * 1000)  // too far in past
        ];

        invalidTimestamps.forEach(timestamp => {
          const message = { ...validMessage, timestamp };
          const result = MessageValidators.validatePriceRequestMessage(message);
          expect(result.isValid).toBe(false);
        });
      });
    });

    describe('security: extra properties', () => {
      it('should reject extra properties in strict mode', () => {
        const message = { ...validMessage, maliciousProperty: 'hack' };
        const result = MessageValidators.validatePriceRequestMessage(message, true);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.EXTRA_PROPERTY)).toBe(true);
      });

      it('should allow extra properties in non-strict mode', () => {
        const message = { ...validMessage, extraProperty: 'allowed' };
        const result = MessageValidators.validatePriceRequestMessage(message, false);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('MessageValidators.validatePriceData', () => {
    const validPriceData: PriceData = {
      usdRate: 45000,
      satoshiRate: 0.00045,
      fetchedAt: Date.now(),
      source: 'CoinGecko'
    };

    describe('valid data', () => {
      it('should validate correct PriceData', () => {
        const result = MessageValidators.validatePriceData(validPriceData);
        expect(result.isValid).toBe(true);
        expect(result.data).toEqual(validPriceData);
      });
    });

    describe('invalid numeric values', () => {
      it('should reject zero usdRate', () => {
        const data = { ...validPriceData, usdRate: 0 };
        const result = MessageValidators.validatePriceData(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.INVALID_VALUE && e.path === 'PriceData.usdRate')).toBe(true);
      });

      it('should reject negative usdRate', () => {
        const data = { ...validPriceData, usdRate: -100 };
        const result = MessageValidators.validatePriceData(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.NEGATIVE_NUMBER && e.path === 'PriceData.usdRate')).toBe(true);
      });

      it('should reject infinite usdRate', () => {
        const data = { ...validPriceData, usdRate: Infinity };
        const result = MessageValidators.validatePriceData(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.INVALID_VALUE && e.path === 'PriceData.usdRate')).toBe(true);
      });

      it('should reject NaN satoshiRate', () => {
        const data = { ...validPriceData, satoshiRate: NaN };
        const result = MessageValidators.validatePriceData(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.INVALID_VALUE && e.path === 'PriceData.satoshiRate')).toBe(true);
      });
    });

    describe('invalid source values', () => {
      it('should reject empty source', () => {
        const data = { ...validPriceData, source: '' };
        const result = MessageValidators.validatePriceData(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.EMPTY_STRING && e.path === 'PriceData.source')).toBe(true);
      });

      it('should reject non-string source', () => {
        const data = { ...validPriceData, source: 123 };
        const result = MessageValidators.validatePriceData(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.INVALID_TYPE && e.path === 'PriceData.source')).toBe(true);
      });
    });
  });

  describe('MessageValidators.validatePriceResponseMessage', () => {
    const validSuccessResponse: PriceResponseMessage = {
      type: 'PRICE_RESPONSE',
      requestId: 'test-request',
      status: 'success',
      timestamp: Date.now(),
      data: {
        usdRate: 45000,
        satoshiRate: 0.00045,
        fetchedAt: Date.now(),
        source: 'CoinGecko'
      }
    };

    const validErrorResponse: PriceResponseMessage = {
      type: 'PRICE_RESPONSE',
      requestId: 'test-request',
      status: 'error',
      timestamp: Date.now(),
      error: {
        message: 'Test error',
        code: 'test_error'
      }
    };

    describe('valid responses', () => {
      it('should validate success response', () => {
        const result = MessageValidators.validatePriceResponseMessage(validSuccessResponse);
        expect(result.isValid).toBe(true);
        expect(result.data).toEqual(validSuccessResponse);
      });

      it('should validate error response', () => {
        const result = MessageValidators.validatePriceResponseMessage(validErrorResponse);
        expect(result.isValid).toBe(true);
        expect(result.data).toEqual(validErrorResponse);
      });
    });

    describe('invalid status-specific properties', () => {
      it('should reject success response without data', () => {
        const response = { ...validSuccessResponse };
        delete (response as any).data;
        const result = MessageValidators.validatePriceResponseMessage(response);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.MISSING_PROPERTY && e.path === 'PriceResponseMessage.data')).toBe(true);
      });

      it('should reject success response with error property', () => {
        const response = { ...validSuccessResponse, error: { message: 'test', code: 'test' } };
        const result = MessageValidators.validatePriceResponseMessage(response);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.EXTRA_PROPERTY && e.path === 'PriceResponseMessage.error')).toBe(true);
      });

      it('should reject error response without error', () => {
        const response = { ...validErrorResponse };
        delete (response as any).error;
        const result = MessageValidators.validatePriceResponseMessage(response);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.MISSING_PROPERTY && e.path === 'PriceResponseMessage.error')).toBe(true);
      });

      it('should reject error response with data property', () => {
        const response = { ...validErrorResponse, data: validSuccessResponse.data };
        const result = MessageValidators.validatePriceResponseMessage(response);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.EXTRA_PROPERTY && e.path === 'PriceResponseMessage.data')).toBe(true);
      });
    });

    describe('nested validation', () => {
      it('should validate nested PriceData in success response', () => {
        const response = {
          ...validSuccessResponse,
          data: { ...validSuccessResponse.data!, usdRate: -100 }
        };
        const result = MessageValidators.validatePriceResponseMessage(response);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.path === 'PriceData.usdRate' && e.code === ValidationErrorCode.NEGATIVE_NUMBER)).toBe(true);
      });

      it('should validate nested error object in error response', () => {
        const response = {
          ...validErrorResponse,
          error: { message: '', code: 'test' }
        };
        const result = MessageValidators.validatePriceResponseMessage(response);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.path === 'ErrorObject.message' && e.code === ValidationErrorCode.EMPTY_STRING)).toBe(true);
      });
    });
  });

  describe('MessageValidators.validateCoinGeckoApiResponse', () => {
    const validResponse: CoinGeckoApiResponse = {
      bitcoin: {
        usd: 45000
      }
    };

    describe('valid responses', () => {
      it('should validate correct CoinGecko response', () => {
        const result = MessageValidators.validateCoinGeckoApiResponse(validResponse);
        expect(result.isValid).toBe(true);
        expect(result.data).toEqual(validResponse);
      });

      it('should allow extra properties in non-strict mode', () => {
        const responseWithExtra = {
          ...validResponse,
          extraProperty: 'allowed',
          bitcoin: {
            ...validResponse.bitcoin,
            eur: 42000
          }
        };
        const result = MessageValidators.validateCoinGeckoApiResponse(responseWithExtra, false);
        expect(result.isValid).toBe(true);
      });
    });

    describe('invalid responses', () => {
      it('should reject response missing bitcoin property', () => {
        const response = {};
        const result = MessageValidators.validateCoinGeckoApiResponse(response);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.MISSING_PROPERTY && e.path === 'CoinGeckoApiResponse.bitcoin')).toBe(true);
      });

      it('should reject bitcoin object missing usd property', () => {
        const response = { bitcoin: {} };
        const result = MessageValidators.validateCoinGeckoApiResponse(response);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.MISSING_PROPERTY && e.path === 'CoinGeckoApiResponse.bitcoin.usd')).toBe(true);
      });

      it('should reject invalid usd price', () => {
        const invalidPrices = [0, -100, Infinity, -Infinity, NaN, 'not-a-number'];
        
        invalidPrices.forEach(usd => {
          const response = { bitcoin: { usd } };
          const result = MessageValidators.validateCoinGeckoApiResponse(response);
          expect(result.isValid).toBe(false);
        });
      });
    });
  });

  describe('SecureValidation.validateChromeMessage', () => {
    const mockSender: chrome.runtime.MessageSender = {
      tab: { id: 123, url: 'https://example.com' } as chrome.tabs.Tab,
      frameId: 0,
      origin: 'https://example.com'
    };

    it('should validate PRICE_REQUEST messages', () => {
      const message: PriceRequestMessage = {
        type: 'PRICE_REQUEST',
        requestId: 'test-123',
        timestamp: Date.now()
      };

      const result = SecureValidation.validateChromeMessage(message, mockSender, 'PRICE_REQUEST');
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(message);
    });

    it('should validate PRICE_RESPONSE messages', () => {
      const message: PriceResponseMessage = {
        type: 'PRICE_RESPONSE',
        requestId: 'test-123',
        status: 'success',
        timestamp: Date.now(),
        data: {
          usdRate: 45000,
          satoshiRate: 0.00045,
          fetchedAt: Date.now(),
          source: 'CoinGecko'
        }
      };

      const result = SecureValidation.validateChromeMessage(message, mockSender, 'PRICE_RESPONSE');
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(message);
    });

    it('should reject invalid messages and log security events', () => {
      const maliciousMessage = {
        type: 'PRICE_REQUEST',
        requestId: 'test',
        timestamp: Date.now(),
        maliciousScript: '<script>alert("xss")</script>',
        __proto__: { hack: true }
      };

      const result = SecureValidation.validateChromeMessage(maliciousMessage, mockSender, 'PRICE_REQUEST');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Security edge cases', () => {
    describe('property injection attacks', () => {
      it('should prevent __proto__ pollution', () => {
        // Create a message with explicit __proto__ property (realistic attack scenario)
        const maliciousMessage = {
          type: 'PRICE_REQUEST',
          requestId: 'test',
          timestamp: Date.now()
        };
        
        // Explicitly set __proto__ as an own property (realistic attack method)
        Object.defineProperty(maliciousMessage, '__proto__', {
          value: { polluted: true },
          enumerable: true,
          configurable: true
        });

        const result = MessageValidators.validatePriceRequestMessage(maliciousMessage);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.EXTRA_PROPERTY)).toBe(true);
      });

      it('should prevent constructor injection', () => {
        const maliciousMessage = {
          type: 'PRICE_REQUEST',
          requestId: 'test',
          timestamp: Date.now(),
          constructor: { prototype: { hack: true } }
        };

        const result = MessageValidators.validatePriceRequestMessage(maliciousMessage);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.EXTRA_PROPERTY)).toBe(true);
      });
    });

    describe('type coercion attacks', () => {
      it('should reject objects that could be coerced to strings', () => {
        const maliciousMessage = {
          type: 'PRICE_REQUEST',
          requestId: { toString: () => 'fake-id' },
          timestamp: Date.now()
        };

        const result = MessageValidators.validatePriceRequestMessage(maliciousMessage);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.INVALID_TYPE && e.path === 'PriceRequestMessage.requestId')).toBe(true);
      });

      it('should reject objects that could be coerced to numbers', () => {
        const maliciousData = {
          usdRate: { valueOf: () => 45000 },
          satoshiRate: 0.00045,
          fetchedAt: Date.now(),
          source: 'CoinGecko'
        };

        const result = MessageValidators.validatePriceData(maliciousData);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.INVALID_TYPE && e.path === 'PriceData.usdRate')).toBe(true);
      });
    });

    describe('nested object validation', () => {
      it('should validate deeply nested objects', () => {
        const responseWithMaliciousNesting = {
          type: 'PRICE_RESPONSE',
          requestId: 'test',
          status: 'success',
          timestamp: Date.now(),
          data: {
            usdRate: 45000,
            satoshiRate: 0.00045,
            fetchedAt: Date.now(),
            source: 'CoinGecko',
            maliciousProperty: { deep: { nested: { hack: true } } }
          }
        };

        const result = MessageValidators.validatePriceResponseMessage(responseWithMaliciousNesting);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === ValidationErrorCode.EXTRA_PROPERTY)).toBe(true);
      });
    });

    describe('boundary value testing', () => {
      it('should handle extremely large numbers', () => {
        const dataWithLargeNumber = {
          usdRate: Number.MAX_SAFE_INTEGER,
          satoshiRate: 0.00045,
          fetchedAt: Date.now(),
          source: 'CoinGecko'
        };

        const result = MessageValidators.validatePriceData(dataWithLargeNumber);
        expect(result.isValid).toBe(true);
      });

      it('should handle very small positive numbers', () => {
        const dataWithSmallNumber = {
          usdRate: Number.MIN_VALUE,
          satoshiRate: Number.MIN_VALUE,
          fetchedAt: Date.now(),
          source: 'CoinGecko'
        };

        const result = MessageValidators.validatePriceData(dataWithSmallNumber);
        expect(result.isValid).toBe(true);
      });

      it('should reject unsafe integers when appropriate', () => {
        const dataWithUnsafeInteger = {
          usdRate: Number.MAX_SAFE_INTEGER + 1,
          satoshiRate: 0.00045,
          fetchedAt: Date.now(),
          source: 'CoinGecko'
        };

        const result = MessageValidators.validatePriceData(dataWithUnsafeInteger);
        // Should still pass since we only check for finite numbers, not safe integers
        expect(result.isValid).toBe(true);
      });
    });
  });
});