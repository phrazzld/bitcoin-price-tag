/**
 * API error handling and validation tests  
 * Split from api.test.ts for better organization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBtcPrice, ApiError, ApiErrorCode } from './api';

// Mock the logger module
vi.mock('../shared/logger', () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockImplementation(() => mockLogger)
  };

  return {
    createLogger: vi.fn().mockReturnValue(mockLogger),
    logger: mockLogger,
    Logger: vi.fn().mockImplementation(() => mockLogger)
  };
});

// Import the mock after vi.mock
import * as loggerModule from '../shared/logger';
import {
  createFailedHttpResponse,
  createMalformedJsonResponse,
  createInvalidResponse,
  setupApiTest,
  cleanupApiTest,
  createMockFetchSequence,
  expectApiCall,
  runAllTimers,
  API_URL
} from '../../tests/utils/api-mocks';

// Use the mock logger from the mocked module
const mockLogger = loggerModule.createLogger('test-api-error');

describe('API error handling', () => {
  beforeEach(setupApiTest);
  afterEach(cleanupApiTest);

  describe('ApiError', () => {
    it('should create an error with code and message', () => {
      const error = new ApiError('Test error', ApiErrorCode.NETWORK_ERROR);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ApiErrorCode.NETWORK_ERROR);
      expect(error.name).toBe('ApiError');
      expect(error.statusCode).toBeUndefined();
    });

    it('should create an error with status code', () => {
      const error = new ApiError('HTTP error', ApiErrorCode.HTTP_ERROR, 404);
      expect(error.message).toBe('HTTP error');
      expect(error.code).toBe(ApiErrorCode.HTTP_ERROR);
      expect(error.statusCode).toBe(404);
    });
  });

  describe('HTTP error handling', () => {
    it('should throw ApiError for HTTP errors', async () => {
      createMockFetchSequence(
        createFailedHttpResponse(404, 'Not Found')
      );

      try {
        await fetchBtcPrice(mockLogger);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.HTTP_ERROR);
        expect((error as ApiError).statusCode).toBe(404);
        expect((error as ApiError).message).toBe('HTTP error 404: Not Found');
      }
    });

    it('should throw ApiError for HTTP 400 Bad Request', async () => {
      const mockFetch = createMockFetchSequence(
        createFailedHttpResponse(400, 'Bad Request')
      );

      try {
        await fetchBtcPrice(mockLogger);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.HTTP_ERROR);
        expect((error as ApiError).statusCode).toBe(400);
        expect((error as ApiError).message).toBe('HTTP error 400: Bad Request');
        // Verify no retry for 400 errors
        expectApiCall(mockFetch, 1);
      }
    });

    it('should throw ApiError for HTTP 401 Unauthorized', async () => {
      const mockFetch = createMockFetchSequence(
        createFailedHttpResponse(401, 'Unauthorized')
      );

      try {
        await fetchBtcPrice(mockLogger);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.HTTP_ERROR);
        expect((error as ApiError).statusCode).toBe(401);
        expect((error as ApiError).message).toBe('HTTP error 401: Unauthorized');
        // Verify no retry for 401 errors
        expectApiCall(mockFetch, 1);
      }
    });

    it('should throw ApiError for HTTP 403 Forbidden', async () => {
      const mockFetch = createMockFetchSequence(
        createFailedHttpResponse(403, 'Forbidden')
      );

      try {
        await fetchBtcPrice(mockLogger);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.HTTP_ERROR);
        expect((error as ApiError).statusCode).toBe(403);
        expect((error as ApiError).message).toBe('HTTP error 403: Forbidden');
        // Verify no retry for 403 errors
        expectApiCall(mockFetch, 1);
      }
    });
  });

  describe('response validation errors', () => {
    it('should throw ApiError for invalid response - not an object', async () => {
      createMockFetchSequence(
        createInvalidResponse(null)
      );

      try {
        await fetchBtcPrice(mockLogger);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
        expect((error as ApiError).message).toBe('Invalid API response: not an object');
      }
    });

    it('should throw ApiError for missing bitcoin property', async () => {
      const invalidResponse = {
        // missing bitcoin property
      };

      createMockFetchSequence(
        createInvalidResponse(invalidResponse)
      );

      try {
        await fetchBtcPrice(mockLogger);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
        expect((error as ApiError).message).toBe('Invalid API response: missing bitcoin data');
      }
    });

    it('should throw ApiError for invalid bitcoin object', async () => {
      const invalidResponse = {
        bitcoin: "not an object"
      };

      createMockFetchSequence(
        createInvalidResponse(invalidResponse)
      );

      try {
        await fetchBtcPrice(mockLogger);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
        expect((error as ApiError).message).toBe('Invalid API response: bitcoin must be an object');
      }
    });

    it('should throw ApiError for missing USD data', async () => {
      const invalidResponse = {
        bitcoin: {
          // missing usd property
        }
      };

      createMockFetchSequence(
        createInvalidResponse(invalidResponse)
      );

      try {
        await fetchBtcPrice(mockLogger);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
        expect((error as ApiError).message).toBe('Invalid API response: usd must be a number');
      }
    });

    it('should throw ApiError for non-numeric USD value', async () => {
      const invalidResponse = {
        bitcoin: {
          usd: "not a number"
        }
      };

      createMockFetchSequence(
        createInvalidResponse(invalidResponse)
      );

      try {
        await fetchBtcPrice(mockLogger);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
        expect((error as ApiError).message).toBe('Invalid API response: usd must be a number');
      }
    });

    it('should throw ApiError for non-positive USD value', async () => {
      const invalidResponse = {
        bitcoin: {
          usd: 0
        }
      };

      createMockFetchSequence(
        createInvalidResponse(invalidResponse)
      );

      try {
        await fetchBtcPrice(mockLogger);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
        expect((error as ApiError).message).toBe('Invalid API response: USD price must be positive');
      }
    });
  });

  describe('network and parsing errors', () => {
    it('should throw ApiError for malformed JSON response', async () => {
      createMockFetchSequence(
        createMalformedJsonResponse()
      );

      try {
        await fetchBtcPrice(mockLogger);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
        expect((error as ApiError).message).toBe('Failed to parse API response');
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to parse API response JSON', expect.objectContaining({
          error: expect.any(SyntaxError) as SyntaxError,
          url: API_URL
        }));
      }
    });

    it('should handle DOMException network errors', async () => {
      const domException = new DOMException('The operation was aborted.', 'AbortError');
      const mockFetch = vi.fn().mockRejectedValue(domException);
      global.fetch = mockFetch;
      
      const fetchPromise = fetchBtcPrice(mockLogger);
      await runAllTimers();
      
      try {
        await fetchPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.NETWORK_ERROR);
        expect((error as ApiError).message).toContain('Network error:');
        expect((error as ApiError).message).toContain('aborted');
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error fetching BTC price', 
          expect.any(DOMException) as DOMException, 
          expect.objectContaining({ errorType: 'network' })
        );
      }
    }, 10000);

    it('should handle unknown errors', async () => {
      const unknownError = new Error('Unknown error');
      createMockFetchSequence(unknownError);

      try {
        await fetchBtcPrice(mockLogger);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.UNKNOWN_ERROR);
        expect((error as ApiError).message).toBe('Unexpected error: Unknown error');
      }
    });

    it('should handle non-Error unknown errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue('String error');
      global.fetch = mockFetch;

      try {
        await fetchBtcPrice(mockLogger);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.UNKNOWN_ERROR);
        expect((error as ApiError).message).toBe('Unexpected error: String error');
      }
    });
  });
});