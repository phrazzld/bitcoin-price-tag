/**
 * Test helper utilities
 */

import type { PriceData, PriceRequestMessage, PriceResponseMessage } from '../../src/common/types';

/**
 * Create a test price data object
 */
export function createTestPriceData(overrides: Partial<PriceData> = {}): PriceData {
  return {
    usdRate: 50000,
    satoshiRate: 0.00002,
    fetchedAt: Date.now(),
    source: 'CoinGecko',
    ...overrides,
  };
}

/**
 * Create a test price request message
 */
export function createTestPriceRequest(overrides: Partial<PriceRequestMessage> = {}): PriceRequestMessage {
  return {
    requestId: 'test-request-' + Math.random().toString(36).substr(2, 9),
    type: 'PRICE_REQUEST',
    timestamp: Date.now(),
    ...overrides,
  };
}

/**
 * Create a test price response message
 */
export function createTestPriceResponse(
  requestId: string,
  data?: PriceData,
  error?: { message: string; code: string }
): PriceResponseMessage {
  const base: PriceResponseMessage = {
    requestId,
    type: 'PRICE_RESPONSE',
    status: data ? 'success' : 'error',
    timestamp: Date.now(),
  };

  if (data) {
    return { ...base, data };
  } else if (error) {
    return { ...base, error };
  }

  throw new Error('Either data or error must be provided');
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 1000,
  interval = 10
): Promise<void> {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Create a deferred promise for testing async operations
 */
export function createDeferred<T = void>() {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}