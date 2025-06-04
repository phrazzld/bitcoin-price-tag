/**
 * Shared API test utilities and mocks
 * Used by split API test files to avoid duplication
 */

import { vi } from 'vitest';
import { CoinGeckoApiResponse } from '../../src/common/types';

/**
 * Create mock logger object
 * Shared logger mock implementation
 */
export const createMockLogger = () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockImplementation(() => mockLogger)
  };
  return mockLogger;
};

/**
 * Logger mock configuration for vi.mock
 * Returns the mock factory function
 */
export const getLoggerMockFactory = () => {
  const mockLogger = createMockLogger();
  return () => ({
    createLogger: vi.fn().mockReturnValue(mockLogger),
    logger: mockLogger,
    Logger: vi.fn().mockImplementation(() => mockLogger)
  });
};

/**
 * Valid API response for testing success scenarios
 */
export const createValidApiResponse = (usdPrice: number = 43000): CoinGeckoApiResponse => ({
  bitcoin: {
    usd: usdPrice
  }
});

/**
 * Create a successful fetch response
 */
export const createSuccessResponse = (data: CoinGeckoApiResponse, status: number = 200) => ({
  ok: true,
  status,
  statusText: status === 200 ? 'OK' : 'Success',
  json: vi.fn().mockResolvedValue(data)
});

/**
 * Create a failed HTTP response
 */
export const createFailedHttpResponse = (status: number, statusText: string) => ({
  ok: false,
  status,
  statusText,
  json: vi.fn().mockRejectedValue(new Error('No JSON body'))
});

/**
 * Create a response with malformed JSON
 */
export const createMalformedJsonResponse = () => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token < in JSON at position 0'))
});

/**
 * Create an invalid API response (wrong structure)
 */
export const createInvalidResponse = (data: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: vi.fn().mockResolvedValue(data)
});

/**
 * Setup basic test environment with mocks and timers
 */
export const setupApiTest = () => {
  vi.clearAllMocks();
  vi.useFakeTimers();
};

/**
 * Cleanup test environment
 */
export const cleanupApiTest = () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
};

/**
 * Advanced timer management for retry tests
 */
export const advanceTimersForRetry = async (delayMs: number) => {
  await vi.advanceTimersByTimeAsync(delayMs);
};

/**
 * Run all pending timers for completion
 */
export const runAllTimers = async () => {
  await vi.runAllTimersAsync();
};

/**
 * Common API URL for testing
 */
export const API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';

/**
 * Mock fetch setup for multiple scenarios
 */
export const createMockFetchSequence = (...responses: Array<Response | Error | string>) => {
  const mockFetch = vi.fn();
  responses.forEach((response) => {
    if (response instanceof Error) {
      mockFetch.mockRejectedValueOnce(response);
    } else {
      mockFetch.mockResolvedValueOnce(response);
    }
  });
  global.fetch = mockFetch;
  return mockFetch;
};

/**
 * Expect fetch to have been called with API URL
 */
export const expectApiCall = (mockFetch: ReturnType<typeof vi.fn>, times: number = 1) => {
  expect(mockFetch).toHaveBeenCalledTimes(times);
  expect(mockFetch).toHaveBeenCalledWith(API_URL);
};

/**
 * Common test data
 */
export const TEST_PRICES = {
  STANDARD: 43000,
  LARGE: 1_000_000_000,
  SMALL: 0.01
} as const;

/**
 * Calculate expected satoshi rate
 */
export const calculateSatoshiRate = (usdPrice: number): number => {
  return usdPrice / 100_000_000;
};