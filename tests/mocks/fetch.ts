/**
 * Mock for the global fetch API
 * Used to simulate external API calls in tests
 */

import { vi } from 'vitest';
import type { CoinGeckoApiResponse } from '../../src/common/types';

/**
 * Configuration options for creating a mock fetch implementation.
 */
export interface FetchMockConfig {
  /**
   * The default Bitcoin price in USD to use in mock responses.
   * @default 50000
   */
  defaultPrice?: number;
  
  /**
   * Whether the mock should simulate a failed request.
   * @default false
   */
  shouldFail?: boolean;
  
  /**
   * The error message to use when simulating a failed request.
   * @default 'Network error'
   */
  failureMessage?: string;
  
  /**
   * The delay in milliseconds to simulate network latency.
   * @default 0
   */
  responseDelay?: number;
  
  /**
   * The HTTP status code to return for failed requests.
   * @default 500
   */
  statusCode?: number;
}

/**
 * Creates a mock implementation of the global fetch function for testing.
 * 
 * This function returns a Jest/Vitest mock function that simulates API responses
 * and network conditions based on the provided configuration. It is primarily used
 * to test code that makes HTTP requests without making actual network calls.
 * 
 * @param config - Configuration options for the mock behavior
 * @returns A mock function that implements the fetch API interface
 * 
 * @example
 * // Basic usage with default settings (successful response with BTC price of 50000)
 * global.fetch = createFetchMock();
 * 
 * @example
 * // Configure a failed request with a specific error
 * global.fetch = createFetchMock({
 *   shouldFail: true,
 *   failureMessage: 'Connection timeout',
 *   statusCode: 504
 * });
 * 
 * @example
 * // Simulate network latency
 * global.fetch = createFetchMock({
 *   responseDelay: 100 // 100ms delay
 * });
 */
export function createFetchMock(config: FetchMockConfig = {}) {
  const {
    defaultPrice = 50000,
    shouldFail = false,
    failureMessage = 'Network error',
    responseDelay = 0,
    statusCode = 500,
  } = config;

  return vi.fn().mockImplementation(async (url: string) => {
    // Simulate network delay
    if (responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, responseDelay));
    }

    if (shouldFail) {
      // Return appropriate HTTP response for error scenarios
      return {
        ok: false,
        status: statusCode,
        json: () => Promise.reject(new Error(failureMessage)),
        text: () => Promise.resolve(failureMessage),
      };
    }

    // Simulate CoinGecko API response
    if (url.includes('api.coingecko.com')) {
      const response: CoinGeckoApiResponse = {
        bitcoin: {
          usd: defaultPrice
        }
      };

      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
      };
    }

    // Unknown URL
    return {
      ok: false,
      status: 404,
      json: () => Promise.reject(new Error('Not found')),
      text: () => Promise.resolve('Not found'),
    };
  });
}

/**
 * Creates a mock fetch implementation that returns a successful response with a
 * specified Bitcoin price.
 * 
 * This is a convenience wrapper around createFetchMock() for the common use case
 * of mocking a successful price response.
 * 
 * @param price - The Bitcoin price in USD to include in the mock response
 * @returns A mock function that implements the fetch API interface
 * 
 * @example
 * // Mock a response with Bitcoin priced at 45000 USD
 * global.fetch = mockFetchPrice(45000);
 */
export function mockFetchPrice(price: number) {
  return createFetchMock({ defaultPrice: price });
}

/**
 * Creates a mock fetch implementation that simulates an error response.
 * 
 * This function helps test error handling code by simulating network errors 
 * or HTTP error responses.
 * 
 * @param message - The error message to return
 * @param statusCode - The HTTP status code to return
 * @returns A mock function that implements the fetch API interface
 * @throws Will cause the json() method to reject with the specified error message
 * 
 * @example
 * // Simulate a server error
 * global.fetch = mockFetchError('Internal Server Error', 500);
 * 
 * @example
 * // Simulate a client error
 * global.fetch = mockFetchError('Not Found', 404);
 */
export function mockFetchError(message = 'Network error', statusCode = 500) {
  return createFetchMock({ shouldFail: true, failureMessage: message, statusCode });
}

/**
 * Creates a mock fetch implementation for specific CoinGecko API error scenarios.
 * 
 * This function provides pre-configured error responses for common API error
 * situations, making it easy to test error handling for specific scenarios
 * without having to remember the appropriate status codes.
 * 
 * @param errorType - The type of CoinGecko API error to simulate
 * @returns A mock function that implements the fetch API interface
 * @throws Will cause the json() method to reject with the appropriate error
 * 
 * @example
 * // Simulate a rate limit error
 * global.fetch = mockCoinGeckoError('rate-limit');
 * 
 * @example
 * // Simulate a not found error
 * global.fetch = mockCoinGeckoError('not-found');
 */
export function mockCoinGeckoError(errorType: 'rate-limit' | 'unauthorized' | 'not-found' | 'bad-request' | 'server-error') {
  const errorConfig = {
    'rate-limit': { message: 'API rate limit exceeded', statusCode: 429 },
    'unauthorized': { message: 'Invalid API key', statusCode: 403 },
    'not-found': { message: 'Resource not found', statusCode: 404 },
    'bad-request': { message: 'Invalid request parameters', statusCode: 400 },
    'server-error': { message: 'Internal server error', statusCode: 500 },
  };

  const { message, statusCode } = errorConfig[errorType];
  return mockFetchError(message, statusCode);
}