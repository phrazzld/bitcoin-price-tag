import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBtcPrice, ApiError, ApiErrorCode } from './api';
import { CoinDeskApiResponse } from '../common/types';

// Mock the global fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

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
    const validApiResponse: CoinDeskApiResponse = {
      time: {
        updated: 'Dec 6, 2023 10:00:00 UTC',
        updatedISO: '2023-12-06T10:00:00+00:00',
        updateduk: 'Dec 6, 2023 at 10:00 GMT'
      },
      disclaimer: 'This data was produced from the CoinDesk Bitcoin Price Index',
      bpi: {
        USD: {
          code: 'USD',
          rate: '43,000.00',
          description: 'United States Dollar',
          rate_float: 43000.00
        }
      }
    };

    describe('successful responses', () => {
      it('should fetch and parse valid price data', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => validApiResponse
        });

        const result = await fetchBtcPrice();

        expect(mockFetch).toHaveBeenCalledWith('https://api.coindesk.com/v1/bpi/currentprice/USD.json');
        expect(result).toEqual({
          usdRate: 43000.00,
          satoshiRate: 0.00043,
          fetchedAt: expect.any(Number),
          source: 'CoinDesk'
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
          await fetchBtcPrice();
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
          await fetchBtcPrice();
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
          expect((error as ApiError).message).toBe('Invalid API response: not an object');
        }
      });

      it('should throw ApiError for missing time property', async () => {
        const invalidResponse = {
          bpi: validApiResponse.bpi
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => invalidResponse
        });

        try {
          await fetchBtcPrice();
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
          expect((error as ApiError).message).toBe('Invalid API response: missing required properties');
        }
      });

      it('should throw ApiError for missing bpi property', async () => {
        const invalidResponse = {
          time: validApiResponse.time
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => invalidResponse
        });

        try {
          await fetchBtcPrice();
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
          expect((error as ApiError).message).toBe('Invalid API response: missing required properties');
        }
      });

      it('should throw ApiError for missing USD data', async () => {
        const invalidResponse = {
          time: validApiResponse.time,
          bpi: {}
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => invalidResponse
        });

        try {
          await fetchBtcPrice();
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
          expect((error as ApiError).message).toBe('Invalid API response: missing USD data');
        }
      });

      it('should throw ApiError for missing rate_float', async () => {
        const invalidResponse = {
          time: validApiResponse.time,
          bpi: {
            USD: {
              code: 'USD',
              rate: '43,000.00',
              description: 'United States Dollar'
              // Missing rate_float
            }
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => invalidResponse
        });

        try {
          await fetchBtcPrice();
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
          expect((error as ApiError).message).toBe('Invalid API response: missing or invalid rate_float');
        }
      });

      it('should throw ApiError for non-numeric rate_float', async () => {
        const invalidResponse = {
          time: validApiResponse.time,
          bpi: {
            USD: {
              code: 'USD',
              rate: '43,000.00',
              description: 'United States Dollar',
              rate_float: '43000' // String instead of number
            }
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => invalidResponse
        });

        try {
          await fetchBtcPrice();
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.INVALID_RESPONSE);
          expect((error as ApiError).message).toBe('Invalid API response: missing or invalid rate_float');
        }
      });

      it('should handle unknown errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Some unexpected error'));

        try {
          await fetchBtcPrice();
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.UNKNOWN_ERROR);
          expect((error as ApiError).message).toBe('Unexpected error: Some unexpected error');
        }
      });

      it('should handle non-Error unknown errors', async () => {
        mockFetch.mockRejectedValueOnce('string error');

        try {
          await fetchBtcPrice();
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.UNKNOWN_ERROR);
          expect((error as ApiError).message).toBe('Unexpected error: string error');
        }
      });
    });

    describe('retry logic', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should retry on HTTP 429 (Too Many Requests)', async () => {
        // First two attempts fail with 429, third succeeds
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests'
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests'
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => validApiResponse
          });

        const promise = fetchBtcPrice();

        // Advance timers for retries
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry

        const result = await promise;

        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(result.usdRate).toBe(43000);
      });

      it('should retry on HTTP 500+ errors', async () => {
        // First attempt fails with 500, second succeeds
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => validApiResponse
          });

        const promise = fetchBtcPrice();
        
        // Advance timer for retry
        await vi.advanceTimersByTimeAsync(1000);
        
        const result = await promise;

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.usdRate).toBe(43000);
      });

      it('should retry on network errors', async () => {
        // First attempt fails with network error, second succeeds
        mockFetch
          .mockRejectedValueOnce(new TypeError('Network failure'))
          .mockResolvedValueOnce({
            ok: true,
            json: async () => validApiResponse
          });

        const promise = fetchBtcPrice();
        
        // Advance timer for retry
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
          await fetchBtcPrice();
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect(mockFetch).toHaveBeenCalledTimes(1);
        }
      });

      it('should respect max retry attempts', async () => {
        // All attempts fail
        mockFetch
          .mockResolvedValue({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests'
          });

        const promise = fetchBtcPrice();
        
        // Advance timers for all retry attempts
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third retry
        
        try {
          await promise;
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
        }
      });

      it('should use exponential backoff for retries', async () => {
        // All attempts fail
        mockFetch
          .mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Server Error'
          });

        const promise = fetchBtcPrice();

        // Advance timers to trigger retries with exponential backoff
        await vi.advanceTimersByTimeAsync(1000); // First retry (1s delay)
        await vi.advanceTimersByTimeAsync(2000); // Second retry (2s delay)
        await vi.advanceTimersByTimeAsync(4000); // Third retry (4s delay)

        try {
          await promise;
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect(mockFetch).toHaveBeenCalledTimes(4);
        }
      });

      it('should throw ApiError for network errors after exhausting retries', async () => {
        // Mock fetch to always fail with network error
        mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

        const promise = fetchBtcPrice();

        // Advance timers for all retry attempts
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third retry

        try {
          await promise;
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          expect((error as ApiError).code).toBe(ApiErrorCode.NETWORK_ERROR);
          expect((error as ApiError).message).toBe('Network error: Failed to fetch');
          // Should have tried 4 times (initial + 3 retries)
          expect(mockFetch).toHaveBeenCalledTimes(4);
        }
      });
    });

    describe('rate calculations', () => {
      it('should correctly calculate satoshi rate', async () => {
        const btcPrice = 50000;
        const response = {
          ...validApiResponse,
          bpi: {
            USD: {
              ...validApiResponse.bpi.USD,
              rate_float: btcPrice
            }
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => response
        });

        const result = await fetchBtcPrice();

        expect(result.usdRate).toBe(btcPrice);
        expect(result.satoshiRate).toBe(btcPrice / 100000000);
        expect(result.satoshiRate).toBe(0.0005);
      });
    });
  });
});