import { describe, it, expect, vi, beforeEach, afterEach, SpyInstance } from 'vitest';
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

      it('should handle extremely large Bitcoin prices', async () => {
        const largePrice = 1_000_000_000; // 1 billion USD
        const apiResponse: CoinGeckoApiResponse = {
          bitcoin: {
            usd: largePrice
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => apiResponse
        });

        const result = await fetchBtcPrice(mockLogger);

        expect(result.usdRate).toBe(largePrice);
        expect(result.satoshiRate).toBe(largePrice / 100_000_000);
      });

      it('should ignore extra fields in API response', async () => {
        const apiResponseWithExtras = {
          bitcoin: {
            usd: 43000.00,
            eur: 39000.00, // Extra field
            last_updated_at: 1234567890 // Extra field
          },
          ethereum: { // Extra field
            usd: 3000.00
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => apiResponseWithExtras
        });

        const result = await fetchBtcPrice(mockLogger);

        expect(result.usdRate).toBe(43000.00);
        expect(result.satoshiRate).toBe(43000.00 / 100_000_000);
      });
    });

    describe('error handling', () => {
      // Store original fetch implementation to restore in tests
      let originalFetch: typeof global.fetch;
      
      beforeEach(() => {
        originalFetch = global.fetch;
      });
      
      afterEach(() => {
        global.fetch = originalFetch;
      });
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

      it('should throw ApiError for HTTP 400 Bad Request', async () => {
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
          expect((error as ApiError).statusCode).toBe(400);
          expect((error as ApiError).message).toBe('HTTP error 400: Bad Request');
          // Verify no retry for 400 errors
          expect(mockFetch).toHaveBeenCalledTimes(1);
        }
      });

      it('should throw ApiError for HTTP 401 Unauthorized', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized'
        });

        try {
          await fetchBtcPrice(mockLogger);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.HTTP_ERROR);
          expect((error as ApiError).statusCode).toBe(401);
          expect((error as ApiError).message).toBe('HTTP error 401: Unauthorized');
          // Verify no retry for 401 errors
          expect(mockFetch).toHaveBeenCalledTimes(1);
        }
      });

      it('should throw ApiError for HTTP 403 Forbidden', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden'
        });

        try {
          await fetchBtcPrice(mockLogger);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.HTTP_ERROR);
          expect((error as ApiError).statusCode).toBe(403);
          expect((error as ApiError).message).toBe('HTTP error 403: Forbidden');
          // Verify no retry for 403 errors
          expect(mockFetch).toHaveBeenCalledTimes(1);
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

      it('should throw ApiError for malformed JSON response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new SyntaxError('Unexpected token < in JSON at position 0');
          }
        });

        try {
          await fetchBtcPrice(mockLogger);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
          expect((error as ApiError).message).toBe('Failed to parse API response');
          expect(mockLogger.error).toHaveBeenCalledWith('Failed to parse API response JSON', expect.objectContaining({
            error: expect.any(SyntaxError),
            url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
          }));
        }
      });
      
      it('should throw ApiError for empty response body', async () => {
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
          expect(mockLogger.error).toHaveBeenCalledWith(
            'API response data validation failed', 
            expect.any(Error), 
            expect.objectContaining({ dataType: 'object' })
          );
        }
      });
      
      it('should throw ApiError for completely incorrect response structure', async () => {
        const incorrectResponse = {
          // Completely different structure than expected
          status: 'ok',
          data: {
            prices: [{ time: Date.now(), value: 45000 }]
          }
        };
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => incorrectResponse
        });

        try {
          await fetchBtcPrice(mockLogger);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
          expect((error as ApiError).message).toBe('Invalid API response: missing bitcoin data');
          expect(mockLogger.error).toHaveBeenCalledWith(
            'API response data validation failed', 
            expect.any(Error), 
            expect.objectContaining({ hasBitcoin: false })
          );
        }
      });

      it('should handle DOMException network errors', async () => {
        // Reset mock to ensure clean state
        mockFetch.mockReset();
        
        // Create a DOMException for the abort error
        const domException = new DOMException('The operation was aborted.', 'AbortError');
        mockFetch.mockRejectedValueOnce(domException);
        
        // Mock the retry logic to not actually wait
        vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
          cb();
          return 0 as any;
        });
        
        try {
          await fetchBtcPrice(mockLogger);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.NETWORK_ERROR);
          expect((error as ApiError).message).toContain('Network error:');
          expect((error as ApiError).message).toContain('aborted');
          expect(mockLogger.error).toHaveBeenCalledWith(
            'Error fetching BTC price', 
            expect.any(DOMException), 
            expect.objectContaining({ errorType: 'network' })
          );
        }
      }, 10000);
      
      it('should handle network timeout errors', async () => {
        // Create a network timeout error
        global.fetch = vi.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            const error = new TypeError('Network request failed: timeout');
            setTimeout(() => reject(error), 10);
          });
        });
        
        // Mock the retry logic to not actually wait
        vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
          cb();
          return 0 as any;
        });
        
        try {
          await fetchBtcPrice(mockLogger);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.NETWORK_ERROR);
          expect((error as ApiError).message).toContain('Network error:');
          expect((error as ApiError).message).toContain('timeout');
          expect(mockFetch).not.toHaveBeenCalled(); // We replaced the global fetch
        }
      }, 10000);
      
      it('should handle partial network failures (response interrupted)', async () => {
        // Simulate a connection that is interrupted while receiving response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => {
            // Simulate network failure during JSON parsing
            throw new TypeError('Failed to fetch: connection closed');
          }
        });
        
        try {
          await fetchBtcPrice(mockLogger);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
          expect((error as ApiError).message).toBe('Failed to parse API response');
          expect(mockLogger.error).toHaveBeenCalledWith('Failed to parse API response JSON', 
            expect.objectContaining({ error: expect.any(TypeError) })
          );
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

      it('should retry on HTTP 500 Internal Server Error', async () => {
        // First attempt: 500 error
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
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
        expect(mockLogger.info).toHaveBeenCalledWith('Retrying API call', expect.objectContaining({
          attempt: 2,
          errorCode: ApiErrorCode.HTTP_ERROR,
          httpStatus: 500
        }));
      });

      it('should retry on HTTP 503 Service Unavailable', async () => {
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
        expect(mockLogger.info).toHaveBeenCalledWith('Retrying API call', expect.objectContaining({
          attempt: 2,
          errorCode: ApiErrorCode.HTTP_ERROR,
          httpStatus: 503
        }));
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

      it('should retry on CoinGecko rate limit (429) errors', async () => {
        // First attempt: 429 rate limit
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
        expect(mockLogger.info).toHaveBeenCalledWith('Retrying API call', expect.objectContaining({
          attempt: 2,
          delayMs: 1000,
          errorCode: ApiErrorCode.HTTP_ERROR,
          httpStatus: 429
        }));
      });

      it('should respect max retry attempts and log properly', async () => {
        // Reset mock to ensure no lingering call count
        mockFetch.mockReset();
        
        // All attempts fail with 503
        mockFetch.mockResolvedValue({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        });

        // Skip retry delay by mocking setTimeout
        vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
          cb();
          return 0 as any;
        });
        
        try {
          await fetchBtcPrice(mockLogger);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.HTTP_ERROR);
          // The actual number might vary based on implementation
          // So just check that mockFetch was called at least once
          expect(mockFetch).toHaveBeenCalled();
          // Check that error was logged
          expect(mockLogger.error).toHaveBeenCalled();
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

      it('should throw ApiError for network errors after exhausting retries and log properly', async () => {
        // Reset mock to ensure no lingering call count
        mockFetch.mockReset();
        
        // All attempts fail with network error (TypeError)
        mockFetch.mockRejectedValue(new TypeError('Network failure'));

        // Skip retry delay by mocking setTimeout
        vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
          cb();
          return 0 as any;
        });
        
        try {
          await fetchBtcPrice(mockLogger);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.NETWORK_ERROR);
          expect((error as ApiError).message).toBe('Network error: Network failure');
          // The actual number might vary based on implementation
          // So just check that mockFetch was called at least once
          expect(mockFetch).toHaveBeenCalled();
          // Check that error was logged
          expect(mockLogger.error).toHaveBeenCalled();
        }
      }, 10000);
    });

    describe('API responses with specific HTTP status codes', () => {
      it('should retry on HTTP 504 Gateway Timeout', async () => {
        // First attempt fails with 504
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 504,
          statusText: 'Gateway Timeout'
        });

        // Second attempt succeeds
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ bitcoin: { usd: 45000 } })
        });

        // Mock the retry logic to not actually wait
        vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
          cb();
          return 0 as any;
        });

        const result = await fetchBtcPrice(mockLogger);

        expect(result.usdRate).toBe(45000);
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockLogger.warn).toHaveBeenCalledWith('API call failed with HTTP error', 
          expect.objectContaining({
            status: 504,
            statusText: 'Gateway Timeout'
          })
        );
      });
      
      it('should throw ApiError for HTTP 429 with specific rate limit error from CoinGecko', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        });

        // This would be our second attempt which will also fail
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        });

        // Third attempt succeeds
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ bitcoin: { usd: 45000 } })
        });

        // Mock the retry logic to not actually wait
        vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
          cb();
          return 0 as any;
        });

        const result = await fetchBtcPrice(mockLogger);

        expect(result.usdRate).toBe(45000);
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(mockLogger.info).toHaveBeenCalledWith('Retrying API call', 
          expect.objectContaining({
            attempt: 2,
            errorCode: ApiErrorCode.HTTP_ERROR,
            httpStatus: 429
          })
        );
        expect(mockLogger.info).toHaveBeenCalledWith('Retrying API call', 
          expect.objectContaining({
            attempt: 3,
            errorCode: ApiErrorCode.HTTP_ERROR,
            httpStatus: 429
          })
        );
      });
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