import { describe, it, expect } from 'vitest';
import { ApiError, ApiErrorCode, createApiError } from './api-error';
import { BaseError } from './base-error';

describe('ApiError', () => {
  describe('constructor', () => {
    it('should create API error with required properties', () => {
      const error = new ApiError(
        ApiErrorCode.NETWORK_ERROR,
        'Network connection failed'
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.name).toBe('ApiError');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Network connection failed');
    });

    it('should create API error with HTTP status code', () => {
      const error = new ApiError(
        ApiErrorCode.HTTP_ERROR,
        'Server error',
        {
          context: {
            statusCode: 500,
            statusText: 'Internal Server Error',
            endpoint: 'https://api.example.com/data',
            method: 'GET'
          }
        }
      );
      
      expect(error.context?.statusCode).toBe(500);
      expect(error.context?.statusText).toBe('Internal Server Error');
      expect(error.context?.endpoint).toBe('https://api.example.com/data');
      expect(error.context?.method).toBe('GET');
    });

    it('should create API error with retry context', () => {
      const error = new ApiError(
        ApiErrorCode.TIMEOUT_ERROR,
        'Request timed out',
        {
          context: {
            endpoint: 'https://api.example.com/data',
            method: 'POST',
            timeout: 10000,
            retryAttempt: 2,
            maxRetries: 3
          },
          correlationId: 'req_123'
        }
      );
      
      expect(error.context?.timeout).toBe(10000);
      expect(error.context?.retryAttempt).toBe(2);
      expect(error.context?.maxRetries).toBe(3);
      expect(error.correlationId).toBe('req_123');
    });
  });

  describe('error codes', () => {
    it('should have all expected error codes', () => {
      expect(ApiErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ApiErrorCode.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR');
      expect(ApiErrorCode.HTTP_ERROR).toBe('HTTP_ERROR');
      expect(ApiErrorCode.INVALID_RESPONSE).toBe('INVALID_RESPONSE');
      expect(ApiErrorCode.RATE_LIMITED).toBe('RATE_LIMITED');
      expect(ApiErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ApiErrorCode.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('helper functions', () => {
    it('should determine if error is retryable', () => {
      const networkError = new ApiError(ApiErrorCode.NETWORK_ERROR, 'Network failed');
      const timeoutError = new ApiError(ApiErrorCode.TIMEOUT_ERROR, 'Timeout');
      const rateLimitError = new ApiError(ApiErrorCode.RATE_LIMITED, 'Too many requests');
      const authError = new ApiError(ApiErrorCode.UNAUTHORIZED, 'Invalid token');
      
      expect(networkError.isRetryable()).toBe(true);
      expect(timeoutError.isRetryable()).toBe(true);
      expect(rateLimitError.isRetryable()).toBe(true);
      expect(authError.isRetryable()).toBe(false);
    });

    it('should get HTTP status code from context', () => {
      const error = new ApiError(ApiErrorCode.HTTP_ERROR, 'Server error', {
        context: { statusCode: 503 }
      });
      
      expect(error.getStatusCode()).toBe(503);
    });

    it('should return undefined for missing status code', () => {
      const error = new ApiError(ApiErrorCode.NETWORK_ERROR, 'Network error');
      
      expect(error.getStatusCode()).toBeUndefined();
    });
  });

  describe('createApiError factory', () => {
    it('should create network error from generic error', () => {
      const originalError = new Error('ECONNREFUSED');
      const apiError = createApiError(originalError, {
        endpoint: 'https://api.example.com',
        method: 'GET'
      });
      
      expect(apiError).toBeInstanceOf(ApiError);
      expect(apiError.code).toBe('NETWORK_ERROR');
      expect(apiError.cause).toBe(originalError);
      expect(apiError.context?.endpoint).toBe('https://api.example.com');
    });

    it('should create HTTP error from response', () => {
      const apiError = createApiError(new Error('HTTP 404'), {
        endpoint: 'https://api.example.com/user/123',
        method: 'GET',
        statusCode: 404,
        statusText: 'Not Found'
      });
      
      expect(apiError.code).toBe('HTTP_ERROR');
      expect(apiError.context?.statusCode).toBe(404);
      expect(apiError.message).toContain('404');
    });

    it('should detect timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      const apiError = createApiError(timeoutError, {
        endpoint: 'https://api.example.com',
        timeout: 5000
      });
      
      expect(apiError.code).toBe('TIMEOUT_ERROR');
      expect(apiError.context?.timeout).toBe(5000);
    });
  });

  describe('serialization', () => {
    it('should serialize with API-specific context', () => {
      const error = new ApiError(
        ApiErrorCode.HTTP_ERROR,
        'Server error',
        {
          context: {
            statusCode: 500,
            endpoint: 'https://api.example.com',
            method: 'POST',
            responseHeaders: {
              'content-type': 'application/json',
              'x-request-id': 'abc123'
            }
          }
        }
      );
      
      const json = error.toJSON();
      
      expect(json.name).toBe('ApiError');
      expect(json.code).toBe('HTTP_ERROR');
      expect(json.context).toMatchObject({
        statusCode: 500,
        endpoint: 'https://api.example.com',
        method: 'POST'
      });
    });
  });
});