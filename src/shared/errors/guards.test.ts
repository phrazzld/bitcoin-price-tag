import { describe, it, expect } from 'vitest';
import {
  isBaseError,
  isApiError,
  isValidationError,
  isChromeApiError,
  isCacheError,
  isMessagingError,
  isSerializedError,
  getErrorCode,
  getErrorContext
} from './guards';
import { ApiError, ApiErrorCode } from './api-error';
import { ValidationError, ValidationErrorCode } from './validation-error';
import { ChromeApiError, ChromeErrorCode } from './chrome-api-error';
import { CacheError, CacheErrorCode } from './cache-error';
import { MessagingError, MessagingErrorCode } from './messaging-error';

describe('Error Type Guards', () => {
  describe('isBaseError', () => {
    it('should identify BaseError instances', () => {
      const apiError = new ApiError(ApiErrorCode.NETWORK_ERROR, 'Network failed');
      const validationError = new ValidationError(ValidationErrorCode.INVALID_TYPE, 'Wrong type');
      const standardError = new Error('Standard error');
      
      expect(isBaseError(apiError)).toBe(true);
      expect(isBaseError(validationError)).toBe(true);
      expect(isBaseError(standardError)).toBe(false);
      expect(isBaseError(null)).toBe(false);
      expect(isBaseError(undefined)).toBe(false);
      expect(isBaseError({})).toBe(false);
    });
  });

  describe('isApiError', () => {
    it('should identify ApiError instances', () => {
      const apiError = new ApiError(ApiErrorCode.HTTP_ERROR, 'Server error');
      const validationError = new ValidationError(ValidationErrorCode.INVALID_TYPE, 'Wrong type');
      const standardError = new Error('Standard error');
      
      expect(isApiError(apiError)).toBe(true);
      expect(isApiError(validationError)).toBe(false);
      expect(isApiError(standardError)).toBe(false);
    });

    it('should check error code enum', () => {
      const apiError = new ApiError(ApiErrorCode.NETWORK_ERROR, 'Network error');
      const fakeApiError = {
        name: 'ApiError',
        code: 'INVALID_CODE',
        message: 'Fake error'
      };
      
      expect(isApiError(apiError)).toBe(true);
      expect(isApiError(fakeApiError)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should identify ValidationError instances', () => {
      const validationError = new ValidationError(
        ValidationErrorCode.MISSING_FIELD,
        'Field required'
      );
      const apiError = new ApiError(ApiErrorCode.HTTP_ERROR, 'Server error');
      
      expect(isValidationError(validationError)).toBe(true);
      expect(isValidationError(apiError)).toBe(false);
    });
  });

  describe('isChromeApiError', () => {
    it('should identify ChromeApiError instances', () => {
      const chromeError = new ChromeApiError(
        ChromeErrorCode.RUNTIME_ERROR,
        'Extension error'
      );
      const apiError = new ApiError(ApiErrorCode.HTTP_ERROR, 'Server error');
      
      expect(isChromeApiError(chromeError)).toBe(true);
      expect(isChromeApiError(apiError)).toBe(false);
    });
  });

  describe('isCacheError', () => {
    it('should identify CacheError instances', () => {
      const cacheError = new CacheError(
        CacheErrorCode.READ_ERROR,
        'Cache read failed'
      );
      const apiError = new ApiError(ApiErrorCode.HTTP_ERROR, 'Server error');
      
      expect(isCacheError(cacheError)).toBe(true);
      expect(isCacheError(apiError)).toBe(false);
    });
  });

  describe('isMessagingError', () => {
    it('should identify MessagingError instances', () => {
      const messagingError = new MessagingError(
        MessagingErrorCode.TIMEOUT_ERROR,
        'Message timeout'
      );
      const apiError = new ApiError(ApiErrorCode.HTTP_ERROR, 'Server error');
      
      expect(isMessagingError(messagingError)).toBe(true);
      expect(isMessagingError(apiError)).toBe(false);
    });
  });

  describe('isSerializedError', () => {
    it('should identify serialized error objects', () => {
      const serialized = {
        name: 'ApiError',
        message: 'Test error',
        timestamp: new Date().toISOString()
      };
      
      const invalid = {
        error: 'Not a serialized error'
      };
      
      expect(isSerializedError(serialized)).toBe(true);
      expect(isSerializedError(invalid)).toBe(false);
      expect(isSerializedError(null)).toBe(false);
      expect(isSerializedError(undefined)).toBe(false);
    });

    it('should validate required properties', () => {
      const missingName = { message: 'Error', timestamp: '2024-01-01' };
      const missingMessage = { name: 'Error', timestamp: '2024-01-01' };
      const missingTimestamp = { name: 'Error', message: 'Test' };
      
      expect(isSerializedError(missingName)).toBe(false);
      expect(isSerializedError(missingMessage)).toBe(false);
      expect(isSerializedError(missingTimestamp)).toBe(false);
    });
  });

  describe('getErrorCode', () => {
    it('should extract error code from various error types', () => {
      const apiError = new ApiError(ApiErrorCode.HTTP_ERROR, 'Server error');
      const validationError = new ValidationError(
        ValidationErrorCode.INVALID_TYPE,
        'Wrong type'
      );
      const standardError = new Error('No code');
      
      expect(getErrorCode(apiError)).toBe('HTTP_ERROR');
      expect(getErrorCode(validationError)).toBe('INVALID_TYPE');
      expect(getErrorCode(standardError)).toBeUndefined();
      expect(getErrorCode(null)).toBeUndefined();
    });

    it('should handle serialized errors', () => {
      const serialized = {
        name: 'ApiError',
        code: 'NETWORK_ERROR',
        message: 'Network failed'
      };
      
      expect(getErrorCode(serialized as unknown)).toBe('NETWORK_ERROR');
    });
  });

  describe('getErrorContext', () => {
    it('should extract context from various error types', () => {
      const context = { statusCode: 500, endpoint: '/api/data' };
      const apiError = new ApiError(ApiErrorCode.HTTP_ERROR, 'Server error', {
        context
      });
      const standardError = new Error('No context');
      
      expect(getErrorContext(apiError)).toEqual(context);
      expect(getErrorContext(standardError)).toBeUndefined();
      expect(getErrorContext(null)).toBeUndefined();
    });

    it('should handle serialized errors', () => {
      const serialized = {
        name: 'ApiError',
        message: 'Error',
        context: { field: 'email' }
      };
      
      expect(getErrorContext(serialized as unknown)).toEqual({ field: 'email' });
    });
  });

  describe('Type narrowing', () => {
    it('should properly narrow types in conditionals', () => {
      const error: unknown = new ApiError(ApiErrorCode.HTTP_ERROR, 'Error', {
        context: { statusCode: 404 }
      });
      
      if (isApiError(error)) {
        // TypeScript should know this is ApiError
        expect(error.code).toBe('HTTP_ERROR');
        expect(error.getStatusCode()).toBeDefined();
      }
    });

    it('should work with error chains', () => {
      const cause = new ValidationError(ValidationErrorCode.INVALID_TYPE, 'Invalid');
      const error = new ApiError(ApiErrorCode.HTTP_ERROR, 'Request failed', {
        cause
      });
      
      expect(isApiError(error)).toBe(true);
      expect(isValidationError(error.cause)).toBe(true);
    });
  });
});