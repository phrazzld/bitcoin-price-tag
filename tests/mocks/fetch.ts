/**
 * Mock for the global fetch API
 * Used to simulate external API calls in tests
 */

import type { CoinGeckoApiResponse } from '../../src/common/types';

export interface FetchMockConfig {
  defaultPrice?: number;
  shouldFail?: boolean;
  failureMessage?: string;
  responseDelay?: number;
  statusCode?: number;
}

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

export function mockFetchPrice(price: number) {
  return createFetchMock({ defaultPrice: price });
}

export function mockFetchError(message = 'Network error', statusCode = 500) {
  return createFetchMock({ shouldFail: true, failureMessage: message, statusCode });
}

/**
 * Mock CoinGecko API specific error responses
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