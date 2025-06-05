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
  runAllTimers,
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

      // Start the test
      const fetchPromise = fetchBtcPrice(mockLogger);
      
      // Fast-forward through all retries
      await runAllTimers();
      
      try {
        await fetchPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.HTTP_ERROR);
        // Check that mockFetch was called at least once
        expect(mockFetch).toHaveBeenCalled();
        // Check that error was logged
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });

    it('should throw ApiError for network errors after exhausting retries', async () => {
      // All attempts fail with network error (TypeError)
      const mockFetch = vi.fn().mockRejectedValue(new TypeError('Network failure'));
      global.fetch = mockFetch;

      // Start the API call
      const fetchPromise = fetchBtcPrice(mockLogger);
      
      // Fast-forward through all retries
      await runAllTimers();
      
      try {
        await fetchPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.NETWORK_ERROR);
        expect((error as ApiError).message).toBe('Network error: Network failure');
        // Check that mockFetch was called at least once
        expect(mockFetch).toHaveBeenCalled();
        // Check that error was logged
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe('exponential backoff', () => {
    it('should use exponential backoff for retries', async () => {
      // Store original setTimeout before mocking
      const originalSetTimeout = global.setTimeout;
      
      // Spy on setTimeout to capture delay values
      const timeoutSpy = vi.spyOn(global, 'setTimeout');
      const delays: number[] = [];
      
      // Custom mock implementation to track delays but still use original setTimeout
      timeoutSpy.mockImplementation((callback: () => void, delay?: number) => {
        delays.push(delay || 0);
        // Use the original setTimeout to avoid recursion
        return originalSetTimeout(callback, delay);
      });

      // All attempts fail
      const mockFetch = vi.fn().mockResolvedValue(
        createFailedHttpResponse(503, 'Service Unavailable')
      );
      global.fetch = mockFetch;

      // Start the API call
      const promise = fetchBtcPrice(mockLogger);
      
      // Advance timer for all retries
      await runAllTimers();
      
      try {
        await promise;
        expect.fail('Should have thrown');
      } catch (_error) {
        // Expected to throw
      }

      // Verify exponential backoff: 1000ms, 2000ms
      expect(delays.slice(0, 2)).toEqual([1000, 2000]);
    });
  });

  describe('network timeout handling', () => {
    it('should handle network timeout errors with retries', async () => {
      // Create a network timeout error with setTimeout
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          const error = new TypeError('Network request failed: timeout');
          setTimeout(() => reject(error), 10);
        });
      });
      
      // Start the API call
      const fetchPromise = fetchBtcPrice(mockLogger);
      
      // Advance timer to trigger the error and handle retries
      await vi.advanceTimersByTimeAsync(10);
      await runAllTimers();
      
      try {
        await fetchPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ApiErrorCode.NETWORK_ERROR);
        expect((error as ApiError).message).toContain('Network error:');
        expect((error as ApiError).message).toContain('timeout');
      }
    });
  });
});