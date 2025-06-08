/**
 * API retry logic and resilience tests
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
  createValidApiResponse,
  createSuccessResponse,
  createFailedHttpResponse,
  setupApiTest,
  cleanupApiTest,
  createMockFetchSequence,
  expectApiCall,
  advanceTimersForRetry,
  TEST_PRICES,
  API_URL
} from '../../tests/utils/api-mocks';

// Use the mock logger from the mocked module
const mockLogger = loggerModule.createLogger('test-api-retry');

describe('API retry logic', () => {
  beforeEach(setupApiTest);
  afterEach(cleanupApiTest);

  describe('retryable errors', () => {
    it('should retry on HTTP 429 (Too Many Requests)', async () => {
      const mockFetch = createMockFetchSequence(
        createFailedHttpResponse(429, 'Too Many Requests'),
        createSuccessResponse(createValidApiResponse(TEST_PRICES.STANDARD))
      );

      // Start the API call
      const promise = fetchBtcPrice(mockLogger);
      
      // Advance timer to process retry delay
      await advanceTimersForRetry(1000);
      
      // Get the result after the timer has resolved
      const result = await promise;

      expectApiCall(mockFetch, 2);
      expect(result.usdRate).toBe(TEST_PRICES.STANDARD);

      // Verify retry logging
      expect(mockLogger.info).toHaveBeenCalledWith('Retrying API call', {
        attempt: 2,
        delayMs: 1000,
        url: API_URL,
        errorCode: ApiErrorCode.HTTP_ERROR,
        httpStatus: 429
      });
    });

    it('should retry on HTTP 500+ errors', async () => {
      const mockFetch = createMockFetchSequence(
        createFailedHttpResponse(503, 'Service Unavailable'),
        createSuccessResponse(createValidApiResponse(TEST_PRICES.STANDARD))
      );

      // Start the API call
      const promise = fetchBtcPrice(mockLogger);
      
      // Advance timer to process retry delay
      await advanceTimersForRetry(1000);
      
      // Get the result after the timer has resolved
      const result = await promise;

      expectApiCall(mockFetch, 2);
      expect(result.usdRate).toBe(TEST_PRICES.STANDARD);
    });

    it('should retry on HTTP 500 Internal Server Error', async () => {
      const mockFetch = createMockFetchSequence(
        createFailedHttpResponse(500, 'Internal Server Error'),
        createSuccessResponse(createValidApiResponse(TEST_PRICES.STANDARD))
      );

      // Start the API call
      const promise = fetchBtcPrice(mockLogger);
      
      // Advance timer to process retry delay
      await advanceTimersForRetry(1000);
      
      // Get the result after the timer has resolved
      const result = await promise;

      expectApiCall(mockFetch, 2);
      expect(result.usdRate).toBe(TEST_PRICES.STANDARD);
      expect(mockLogger.info).toHaveBeenCalledWith('Retrying API call', expect.objectContaining({
        attempt: 2,
        errorCode: ApiErrorCode.HTTP_ERROR,
        httpStatus: 500
      }) as Record<string, unknown>);
    });

    it('should retry on HTTP 504 Gateway Timeout', async () => {
      const mockFetch = createMockFetchSequence(
        createFailedHttpResponse(504, 'Gateway Timeout'),
        createSuccessResponse(createValidApiResponse(45000))
      );

      // Start the API call
      const fetchPromise = fetchBtcPrice(mockLogger);
      
      // Advance timer to process the retry delay
      await advanceTimersForRetry(1000);
      
      // Get the result
      const result = await fetchPromise;

      expect(result.usdRate).toBe(45000);
      expectApiCall(mockFetch, 2);
      expect(mockLogger.warn).toHaveBeenCalledWith('API call failed with HTTP error', 
        expect.objectContaining({
          status: 504,
          statusText: 'Gateway Timeout'
        }) as Record<string, unknown>
      );
    });

    it('should retry on network errors', async () => {
      const mockFetch = createMockFetchSequence(
        new TypeError('Network failure'),
        createSuccessResponse(createValidApiResponse(TEST_PRICES.STANDARD))
      );

      // Start the API call
      const promise = fetchBtcPrice(mockLogger);
      
      // Advance timer to process retry delay
      await advanceTimersForRetry(1000);
      
      // Get the result after the timer has resolved
      const result = await promise;

      expectApiCall(mockFetch, 2);
      expect(result.usdRate).toBe(TEST_PRICES.STANDARD);
    });
  });

  describe('non-retryable errors', () => {
    it('should not retry on HTTP 4xx errors (except 429)', async () => {
      const mockFetch = createMockFetchSequence(
        createFailedHttpResponse(400, 'Bad Request')
      );

      try {
        await fetchBtcPrice(mockLogger);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.HTTP_ERROR);
        expectApiCall(mockFetch, 1); // No retry
      }
    });
  });

  describe('multiple retries', () => {
    it('should handle multiple 429 errors with progressive delays', async () => {
      const mockFetch = createMockFetchSequence(
        createFailedHttpResponse(429, 'Too Many Requests'),
        createFailedHttpResponse(429, 'Too Many Requests'),
        createSuccessResponse(createValidApiResponse(45000))
      );

      // Start the API call
      const fetchPromise = fetchBtcPrice(mockLogger);
      
      // Advance timers to process both retry delays (1000ms, 2000ms)
      await advanceTimersForRetry(1000); // First retry
      await advanceTimersForRetry(2000); // Second retry
      
      // Get the result
      const result = await fetchPromise;

      expect(result.usdRate).toBe(45000);
      expectApiCall(mockFetch, 3);
      expect(mockLogger.info).toHaveBeenCalledWith('Retrying API call', 
        expect.objectContaining({
          attempt: 2,
          errorCode: ApiErrorCode.HTTP_ERROR,
          httpStatus: 429
        }) as Record<string, unknown>
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Retrying API call', 
        expect.objectContaining({
          attempt: 3,
          errorCode: ApiErrorCode.HTTP_ERROR,
          httpStatus: 429
        }) as Record<string, unknown>
      );
    });
  });

  describe('retry exhaustion', () => {
    it('should respect max retry attempts and log properly', async () => {
      // All attempts fail with 503
      const mockFetch = vi.fn().mockResolvedValue(
        createFailedHttpResponse(503, 'Service Unavailable')
      );
      global.fetch = mockFetch;

      // Start the API call but handle rejection immediately
      const fetchPromise = fetchBtcPrice(mockLogger).catch(e => e);
      
      // Advance through each retry step: 1000ms + 2000ms + 4000ms
      await advanceTimersForRetry(1000); // First retry
      await advanceTimersForRetry(2000); // Second retry  
      await advanceTimersForRetry(4000); // Final attempt
      
      // Get the error result
      const error = await fetchPromise;
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        code: ApiErrorCode.HTTP_ERROR,
        statusCode: 503
      });
      
      // Verify all retry attempts were made (initial + 3 retries = 4 total)
      expect(mockFetch).toHaveBeenCalledTimes(4);
      
      // Verify retry exhaustion was logged
      expect(mockLogger.error).toHaveBeenCalledWith('API call failed after max retries', 
        expect.objectContaining({
          attempts: 3,
          url: API_URL,
          errorCode: ApiErrorCode.HTTP_ERROR,
          httpStatus: 503
        }) as Record<string, unknown>
      );
    });

    it('should throw ApiError for network errors after exhausting retries', async () => {
      // All attempts fail with network error (TypeError)
      const mockFetch = vi.fn().mockRejectedValue(new TypeError('Network failure'));
      global.fetch = mockFetch;

      // Start the API call but handle rejection immediately
      const fetchPromise = fetchBtcPrice(mockLogger).catch(e => e);
      
      // Advance through each retry step: 1000ms + 2000ms + 4000ms
      await advanceTimersForRetry(1000); // First retry
      await advanceTimersForRetry(2000); // Second retry
      await advanceTimersForRetry(4000); // Final attempt
      
      // Get the error result
      const error = await fetchPromise;
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        code: ApiErrorCode.NETWORK_ERROR,
        message: 'Network error: Network failure'
      });
      
      // Verify all retry attempts were made (initial + 3 retries = 4 total)
      expect(mockFetch).toHaveBeenCalledTimes(4);
      
      
      // Verify retry exhaustion was logged
      expect(mockLogger.error).toHaveBeenCalledWith('API call failed after max retries', 
        expect.objectContaining({
          attempts: 3,
          url: API_URL,
          errorCode: ApiErrorCode.NETWORK_ERROR
        }) as Record<string, unknown>
      );
    });
  });

  describe('exponential backoff', () => {
    it('should use exponential backoff for retries', async () => {
      // All attempts fail with 503
      const mockFetch = vi.fn().mockResolvedValue(
        createFailedHttpResponse(503, 'Service Unavailable')
      );
      global.fetch = mockFetch;

      // Start the API call but handle rejection immediately
      const fetchPromise = fetchBtcPrice(mockLogger).catch(e => e);
      
      // Advance through each retry step to verify exponential backoff
      await advanceTimersForRetry(1000); // First retry delay: 1000ms * 2^0 = 1000ms
      await advanceTimersForRetry(2000); // Second retry delay: 1000ms * 2^1 = 2000ms
      await advanceTimersForRetry(4000); // Third retry delay: 1000ms * 2^2 = 4000ms
      
      // Get the error result
      const error = await fetchPromise;
      expect(error).toBeInstanceOf(ApiError);
      
      // Verify retry logging shows exponential backoff delays
      expect(mockLogger.info).toHaveBeenCalledWith('Retrying API call', 
        expect.objectContaining({
          attempt: 2,
          delayMs: 1000
        }) as Record<string, unknown>
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Retrying API call', 
        expect.objectContaining({
          attempt: 3,
          delayMs: 2000
        }) as Record<string, unknown>
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Retrying API call', 
        expect.objectContaining({
          attempt: 4,
          delayMs: 4000
        }) as Record<string, unknown>
      );
    });
  });

  describe('network timeout handling', () => {
    it('should handle network timeout errors with retries', async () => {
      // Create a network timeout error that rejects immediately
      const mockFetch = vi.fn().mockRejectedValue(
        new TypeError('Network request failed: timeout')
      );
      global.fetch = mockFetch;
      
      // Start the API call but handle rejection immediately
      const fetchPromise = fetchBtcPrice(mockLogger).catch(e => e);
      
      // Advance through each retry step for network errors
      await advanceTimersForRetry(1000); // First retry
      await advanceTimersForRetry(2000); // Second retry
      await advanceTimersForRetry(4000); // Final attempt
      
      // Get the error result
      const error = await fetchPromise;
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        code: ApiErrorCode.NETWORK_ERROR,
        message: expect.stringContaining('Network error:')
      });
      
      // Verify all retry attempts were made (initial + 3 retries = 4 total)
      expect(mockFetch).toHaveBeenCalledTimes(4);
      
      // Verify the error message contains timeout info
      expect(error.message).toContain('timeout');
    });
  });
});