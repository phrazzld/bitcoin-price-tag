/**
 * API fetch success scenarios and rate calculations tests
 * Split from api.test.ts for better organization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBtcPrice } from './api';

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
  setupApiTest,
  cleanupApiTest,
  createMockFetchSequence,
  expectApiCall,
  TEST_PRICES,
  calculateSatoshiRate,
  API_URL
} from '../../tests/utils/api-mocks';

// Use the mock logger from the mocked module
const mockLogger = loggerModule.createLogger();

describe('API fetch - success scenarios', () => {
  beforeEach(setupApiTest);
  afterEach(cleanupApiTest);

  describe('successful responses', () => {
    it('should fetch and parse valid price data', async () => {
      const mockFetch = createMockFetchSequence(
        createSuccessResponse(createValidApiResponse(TEST_PRICES.STANDARD))
      );

      const result = await fetchBtcPrice(mockLogger);

      expectApiCall(mockFetch);
      expect(result).toEqual({
        usdRate: TEST_PRICES.STANDARD,
        satoshiRate: calculateSatoshiRate(TEST_PRICES.STANDARD),
        fetchedAt: expect.any(Number) as number,
        source: 'CoinGecko'
      });
      
      // Verify logging calls
      expect(mockLogger.info).toHaveBeenCalledWith('Fetching BTC price', {
        attempt: 1,
        url: API_URL
      });
      expect(mockLogger.info).toHaveBeenCalledWith('API call successful', {
        status: 200, // mockResolvedValue now sets status correctly
        url: API_URL
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Price data successfully fetched', {
        usdRate: TEST_PRICES.STANDARD,
        fetchedAt: expect.any(Number) as number
      });
    });

    it('should handle extremely large Bitcoin prices', async () => {
      const mockFetch = createMockFetchSequence(
        createSuccessResponse(createValidApiResponse(TEST_PRICES.LARGE))
      );

      const result = await fetchBtcPrice(mockLogger);

      expectApiCall(mockFetch);
      expect(result.usdRate).toBe(TEST_PRICES.LARGE);
      expect(result.satoshiRate).toBe(calculateSatoshiRate(TEST_PRICES.LARGE));
    });

    it('should ignore extra fields in API response', async () => {
      const apiResponseWithExtras = {
        bitcoin: {
          usd: TEST_PRICES.STANDARD,
          eur: 39000.00, // Extra field
          last_updated_at: 1234567890 // Extra field
        },
        ethereum: { // Extra field
          usd: 3000.00
        }
      };

      const mockFetch = createMockFetchSequence(
        createSuccessResponse(apiResponseWithExtras)
      );

      const result = await fetchBtcPrice(mockLogger);

      expectApiCall(mockFetch);
      expect(result.usdRate).toBe(TEST_PRICES.STANDARD);
      expect(result.satoshiRate).toBe(calculateSatoshiRate(TEST_PRICES.STANDARD));
    });
  });

  describe('rate calculations', () => {
    it('should correctly calculate satoshi rate', async () => {
      const btcPrice = 50000;
      const mockFetch = createMockFetchSequence(
        createSuccessResponse(createValidApiResponse(btcPrice))
      );

      const result = await fetchBtcPrice(mockLogger);

      expectApiCall(mockFetch);
      expect(result.usdRate).toBe(btcPrice);
      expect(result.satoshiRate).toBe(calculateSatoshiRate(btcPrice));
      expect(result.satoshiRate).toBe(0.0005); // 50000 / 100000000
    });

    it('should handle small Bitcoin prices correctly', async () => {
      const smallPrice = 100;
      const mockFetch = createMockFetchSequence(
        createSuccessResponse(createValidApiResponse(smallPrice))
      );

      const result = await fetchBtcPrice(mockLogger);

      expectApiCall(mockFetch);
      expect(result.usdRate).toBe(smallPrice);
      expect(result.satoshiRate).toBe(calculateSatoshiRate(smallPrice));
      expect(result.satoshiRate).toBe(0.000001); // 100 / 100000000
    });

    it('should include correct metadata in response', async () => {
      const mockFetch = createMockFetchSequence(
        createSuccessResponse(createValidApiResponse(TEST_PRICES.STANDARD))
      );

      const result = await fetchBtcPrice(mockLogger);

      expectApiCall(mockFetch);
      expect(result.source).toBe('CoinGecko');
      expect(result.fetchedAt).toBeTypeOf('number');
      expect(result.fetchedAt).toBeGreaterThan(0);
      expect(Date.now() - result.fetchedAt).toBeLessThan(1000); // Within last second
    });
  });
});