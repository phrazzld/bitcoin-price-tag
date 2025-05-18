/**
 * Mock for the global fetch API
 * Used to simulate external API calls in tests
 */

import type { CoinDeskApiResponse } from '../../src/common/types';

export interface FetchMockConfig {
  defaultPrice?: number;
  shouldFail?: boolean;
  failureMessage?: string;
  responseDelay?: number;
}

export function createFetchMock(config: FetchMockConfig = {}) {
  const {
    defaultPrice = 50000,
    shouldFail = false,
    failureMessage = 'Network error',
    responseDelay = 0,
  } = config;

  return vi.fn().mockImplementation(async (url: string) => {
    // Simulate network delay
    if (responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, responseDelay));
    }

    if (shouldFail) {
      throw new Error(failureMessage);
    }

    // Simulate CoinDesk API response
    if (url.includes('api.coindesk.com')) {
      const response: CoinDeskApiResponse = {
        time: {
          updated: 'Jan 1, 2024 00:00:00 UTC',
          updatedISO: '2024-01-01T00:00:00+00:00',
          updateduk: 'Jan 1, 2024 at 00:00 GMT'
        },
        disclaimer: 'This data was produced from the CoinDesk Bitcoin Price Index...',
        bpi: {
          USD: {
            code: 'USD',
            rate: defaultPrice.toLocaleString('en-US'),
            description: 'United States Dollar',
            rate_float: defaultPrice
          }
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

export function mockFetchError(message = 'Network error') {
  return createFetchMock({ shouldFail: true, failureMessage: message });
}