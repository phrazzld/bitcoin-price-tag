/**
 * Service worker API module for fetching Bitcoin price data from CoinGecko
 */

import { CoinGeckoApiResponse, PriceData } from '../common/types';
import { Logger, createLogger } from '../shared/logger';

/** 
 * CoinGecko API endpoint for fetching current Bitcoin price in USD
 * Note: CoinDesk API was becoming unreliable, switched to CoinGecko
 * @see https://docs.coingecko.com/reference/simple-price
 */
const API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';

/** 
 * Maximum number of retry attempts for transient errors
 * Applies to network errors and retryable HTTP status codes (429, 5xx)
 */
const MAX_RETRY_ATTEMPTS = 3;

/** 
 * Base delay for exponential backoff in milliseconds
 * Actual delay is calculated as BASE_RETRY_DELAY_MS * 2^attemptNumber
 */
const BASE_RETRY_DELAY_MS = 1000;

/** 
 * Base logger for API module
 * Used for logging API calls, responses, and errors
 */
const baseLogger = createLogger('service-worker:api');

/** 
 * Error codes for API-related errors 
 */
export enum ApiErrorCode {
  /** Network-related errors (e.g., offline, timeout) */
  NETWORK_ERROR = 'network_error',
  /** HTTP errors (e.g., 4xx, 5xx status codes) */
  HTTP_ERROR = 'http_error',
  /** Invalid response format or missing required fields */
  INVALID_RESPONSE = 'invalid_response',
  /** General/unexpected errors */
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Custom error class for API-related errors
 */
export class ApiError extends Error {
  /** Error code from ApiErrorCode enum */
  readonly code: ApiErrorCode;
  /** HTTP status code (if applicable) */
  readonly statusCode?: number;

  constructor(message: string, code: ApiErrorCode, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Validates that the API response has the expected structure
 * @param data The parsed JSON response to validate
 * @throws ApiError if validation fails
 */
function validateApiResponse(data: unknown): asserts data is CoinGeckoApiResponse {
  if (!data || typeof data !== 'object') {
    baseLogger.error('API response data validation failed', new Error('Response is not an object'), {
      url: API_URL,
      dataType: typeof data
    });
    throw new ApiError(
      'Invalid API response: not an object',
      ApiErrorCode.INVALID_RESPONSE
    );
  }

  const response = data as Record<string, unknown>;

  // Check for required bitcoin property
  if (!response.bitcoin) {
    baseLogger.error('API response data validation failed', new Error('Missing bitcoin data'), {
      url: API_URL,
      hasBitcoin: !!response.bitcoin
    });
    throw new ApiError(
      'Invalid API response: missing bitcoin data',
      ApiErrorCode.INVALID_RESPONSE
    );
  }

  // Validate bitcoin object structure
  const bitcoin = response.bitcoin as Record<string, unknown>;
  if (typeof bitcoin !== 'object') {
    baseLogger.error('API response data validation failed', new Error('bitcoin is not an object'), {
      url: API_URL,
      bitcoinType: typeof bitcoin
    });
    throw new ApiError(
      'Invalid API response: bitcoin must be an object',
      ApiErrorCode.INVALID_RESPONSE
    );
  }

  // Check for USD property in bitcoin
  if (typeof bitcoin.usd !== 'number') {
    baseLogger.error('API response data validation failed', new Error('Missing or invalid USD data'), {
      url: API_URL,
      hasUsd: 'usd' in bitcoin,
      usdType: typeof bitcoin.usd
    });
    throw new ApiError(
      'Invalid API response: usd must be a number',
      ApiErrorCode.INVALID_RESPONSE
    );
  }

  // Validate that USD price is positive
  if (bitcoin.usd <= 0) {
    baseLogger.error('API response data validation failed', new Error('Invalid USD price'), {
      url: API_URL,
      usdValue: bitcoin.usd
    });
    throw new ApiError(
      'Invalid API response: USD price must be positive',
      ApiErrorCode.INVALID_RESPONSE
    );
  }
}

/**
 * Fetches the current Bitcoin price from the CoinGecko API
 * @param logger Logger instance for logging operations
 * @param retryAttempt Current retry attempt number (internal use for recursion)
 * @returns Promise resolving to PriceData with current Bitcoin price
 * @throws ApiError if the request fails or returns invalid data
 */
export async function fetchBtcPrice(logger: Logger, retryAttempt = 0): Promise<PriceData> {
  logger.info('Fetching BTC price', { 
    attempt: retryAttempt + 1, 
    url: API_URL 
  });

  try {
    // Make the API request
    logger.debug('Attempting fetch call');
    const response = await fetch(API_URL);

    // Check for HTTP errors
    if (!response.ok) {
      logger.warn('API call failed with HTTP error', {
        status: response.status,
        statusText: response.statusText,
        url: API_URL
      });
      throw new ApiError(
        `HTTP error ${response.status}: ${response.statusText}`,
        ApiErrorCode.HTTP_ERROR,
        response.status
      );
    }

    logger.info('API call successful', {
      status: response.status,
      url: API_URL
    });

    // Parse the JSON response
    logger.debug('Parsing API response JSON');
    const data = await response.json();

    // Validate the response structure
    logger.debug('Validating API response data');
    validateApiResponse(data);

    // Extract the Bitcoin price
    const btcPrice = data.bitcoin.usd;
    
    // Calculate the satoshi price (1 BTC = 100,000,000 satoshis)
    const satoshiPrice = btcPrice / 100000000;

    // Return the formatted price data
    const priceData = {
      usdRate: btcPrice,
      satoshiRate: satoshiPrice,
      fetchedAt: Date.now(),
      source: 'CoinGecko'
    };

    logger.debug('Price data successfully fetched', {
      usdRate: priceData.usdRate,
      fetchedAt: priceData.fetchedAt
    });

    return priceData;
  } catch (error) {
    // If it's a JSON parsing error
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      logger.error('Failed to parse API response JSON', {
        error,
        url: API_URL
      });
      throw new ApiError(
        'Failed to parse API response',
        ApiErrorCode.INVALID_RESPONSE
      );
    }

    // If it's already an ApiError, handle it
    if (error instanceof ApiError) {
      // For HTTP 429 (Too Many Requests) or 5xx errors, retry with exponential backoff
      const isRetryable = 
        (error.code === ApiErrorCode.HTTP_ERROR && 
         (error.statusCode === 429 || (error.statusCode && error.statusCode >= 500))) ||
        error.code === ApiErrorCode.NETWORK_ERROR;
      
      if (isRetryable && retryAttempt < MAX_RETRY_ATTEMPTS) {
        // Calculate delay with exponential backoff
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryAttempt);
        
        logger.info('Retrying API call', {
          attempt: retryAttempt + 2, // Next attempt number
          delayMs: delay,
          url: API_URL,
          errorCode: error.code,
          httpStatus: error.statusCode
        });
        
        // Wait and then retry
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchBtcPrice(logger, retryAttempt + 1);
      }
      
      // If we've exhausted retries or the error isn't retryable, log and rethrow
      if (retryAttempt >= MAX_RETRY_ATTEMPTS - 1) {
        logger.error('API call failed after max retries', {
          attempts: MAX_RETRY_ATTEMPTS,
          url: API_URL,
          errorCode: error.code,
          httpStatus: error.statusCode
        });
      }
      throw error;
    }
    
    // For network errors like connection failures
    if (error instanceof TypeError || error instanceof DOMException) {
      logger.error('Error fetching BTC price', error, {
        attempt: retryAttempt + 1,
        url: API_URL,
        errorType: 'network'
      });

      const networkError = new ApiError(
        `Network error: ${error.message}`,
        ApiErrorCode.NETWORK_ERROR
      );
      
      // Retry network errors
      if (retryAttempt < MAX_RETRY_ATTEMPTS) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryAttempt);
        logger.info('Retrying API call', {
          attempt: retryAttempt + 2,
          delayMs: delay,
          url: API_URL,
          errorCode: ApiErrorCode.NETWORK_ERROR
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchBtcPrice(logger, retryAttempt + 1);
      }
      
      logger.error('API call failed after max retries', {
        attempts: MAX_RETRY_ATTEMPTS,
        url: API_URL,
        errorCode: ApiErrorCode.NETWORK_ERROR
      });
      
      throw networkError;
    }
    
    // For unknown errors
    logger.error('Error fetching BTC price', error, {
      attempt: retryAttempt + 1,
      url: API_URL,
      errorType: 'unknown'
    });
    
    throw new ApiError(
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      ApiErrorCode.UNKNOWN_ERROR
    );
  }
}