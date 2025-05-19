import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBtcPrice, ApiError, ApiErrorCode } from './api';
import { CoinGeckoApiResponse } from '../common/types';
import { Logger } from '../shared/logger';

// Mock the global fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create a mock logger
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockImplementation(() => mockLogger)
};

describe('api.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  describe('fetchBtcPrice', () => {
    const validApiResponse: CoinGeckoApiResponse = {
      bitcoin: {
        usd: 43000.00
      }
    };

    describe('successful responses', () => {
      it('should fetch and parse valid price data', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => validApiResponse
        });

        const result = await fetchBtcPrice(mockLogger);

        expect(mockFetch).toHaveBeenCalledWith('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        expect(result).toEqual({
          usdRate: 43000.00,
          satoshiRate: 43000.00 / 100_000_000,
          fetchedAt: expect.any(Number),
          source: 'CoinGecko'
        });
        
        // Verify logging calls
        expect(mockLogger.info).toHaveBeenCalledWith('Fetching BTC price', {
          attempt: 1,
          url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
        });
        expect(mockLogger.info).toHaveBeenCalledWith('API call successful', {
          status: undefined, // mockResolvedValue doesn't set status
          url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
        });
        expect(mockLogger.debug).toHaveBeenCalledWith('Price data successfully fetched', {
          usdRate: 43000,
          fetchedAt: expect.any(Number)
        });
      });
    });

    describe('error handling', () => {
      it('should throw ApiError for HTTP errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        });

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

      it('should throw ApiError for invalid response - not an object', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => null
        });

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

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => invalidResponse
        });

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

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => invalidResponse
        });

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

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => invalidResponse
        });

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

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => invalidResponse
        });

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

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => invalidResponse
        });

        try {
          await fetchBtcPrice(mockLogger);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
          expect((error as ApiError).message).toBe('Invalid API response: USD price must be positive');
        }
      });

      it('should handle unknown errors', async () => {
        const unknownError = new Error('Unknown error');
        mockFetch.mockRejectedValueOnce(unknownError);

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
        mockFetch.mockRejectedValueOnce('String error');

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

    describe('retry logic', () => {
      beforeEach(() => {
        // Need to use fake timers for retry tests
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should retry on HTTP 429 (Too Many Requests)', async () => {
        // First attempt: 429 error
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        });

        // Second attempt: success
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => validApiResponse
        });

        const promise = fetchBtcPrice(mockLogger);
        
        // Advance timer for first retry
        await vi.advanceTimersByTimeAsync(1000);
        
        const result = await promise;

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.usdRate).toBe(43000);

        // Verify retry logging
        expect(mockLogger.info).toHaveBeenCalledWith('Retrying API call', {
          attempt: 2,
          delayMs: 1000,
          url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
          errorCode: ApiErrorCode.HTTP_ERROR,
          httpStatus: 429
        });
      });

      it('should retry on HTTP 500+ errors', async () => {
        // First attempt: 503 error
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        });

        // Second attempt: success
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => validApiResponse
        });

        const promise = fetchBtcPrice(mockLogger);
        
        // Advance timer for first retry
        await vi.advanceTimersByTimeAsync(1000);
        
        const result = await promise;

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.usdRate).toBe(43000);
      });

      it('should retry on network errors', async () => {
        // First attempt: network error (TypeError for fetch failures)
        mockFetch.mockRejectedValueOnce(new TypeError('Network failure'));

        // Second attempt: success
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => validApiResponse
        });

        const promise = fetchBtcPrice(mockLogger);
        
        // Advance timer for first retry
        await vi.advanceTimersByTimeAsync(1000);
        
        const result = await promise;

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.usdRate).toBe(43000);
      });

      it('should not retry on HTTP 4xx errors (except 429)', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request'
        });

        try {
          await fetchBtcPrice(mockLogger);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.HTTP_ERROR);
          expect(mockFetch).toHaveBeenCalledTimes(1); // No retry
        }
      });

      it('should respect max retry attempts', async () => {
        // All attempts fail with 503
        mockFetch.mockResolvedValue({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        });

        try {
          await vi.runAllTimersAsync();
          await fetchBtcPrice(mockLogger);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.HTTP_ERROR);
          expect(mockFetch).toHaveBeenCalledTimes(3); // MAX_RETRY_ATTEMPTS
        }
      }, 10000);

      it('should use exponential backoff for retries', async () => {
        // Mock setTimeout before the test
        const originalSetTimeout = global.setTimeout;
        const delays: number[] = [];
        global.setTimeout = vi.fn((callback: any, delay?: number) => {
          delays.push(delay || 0);
          return originalSetTimeout(callback, 0);
        }) as any;

        // All attempts fail
        mockFetch.mockResolvedValue({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        });

        const promise = fetchBtcPrice(mockLogger);
        
        // Advance timer for all retries
        await vi.runAllTimersAsync();
        
        try {
          await promise;
          expect.fail('Should have thrown');
        } catch (error) {
          // Expected to throw
        }

        // Verify exponential backoff: 1000ms, 2000ms
        expect(delays.slice(0, 2)).toEqual([1000, 2000]);
        
        // Restore original setTimeout
        global.setTimeout = originalSetTimeout;
      });

      it('should throw ApiError for network errors after exhausting retries', async () => {
        // All attempts fail with network error (TypeError)
        mockFetch.mockRejectedValue(new TypeError('Network failure'));

        try {
          await vi.runAllTimersAsync();
          await fetchBtcPrice(mockLogger);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.NETWORK_ERROR);
          expect((error as ApiError).message).toBe('Network error: Network failure');
          expect(mockFetch).toHaveBeenCalledTimes(3); // MAX_RETRY_ATTEMPTS
        }
      }, 10000);
    });

    describe('rate calculations', () => {
      it('should correctly calculate satoshi rate', async () => {
        const btcPrice = 50000;
        const apiResponse: CoinGeckoApiResponse = {
          bitcoin: {
            usd: btcPrice
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => apiResponse
        });

        const result = await fetchBtcPrice(mockLogger);

        expect(result.usdRate).toBe(btcPrice);
        expect(result.satoshiRate).toBe(btcPrice / 100_000_000);
        expect(result.satoshiRate).toBe(0.0005); // 50000 / 100000000
      });
    });
  });
});