/**
 * Service worker API module for fetching Bitcoin price data from CoinDesk
 */

import { CoinDeskApiResponse, PriceData } from '../common/types';

/** CoinDesk API endpoint */
const API_URL = 'https://api.coindesk.com/v1/bpi/currentprice/USD.json';

/** Maximum number of retry attempts for transient errors */
const MAX_RETRY_ATTEMPTS = 3;

/** Base delay for exponential backoff in milliseconds */
const BASE_RETRY_DELAY_MS = 1000;

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
function validateApiResponse(data: unknown): asserts data is CoinDeskApiResponse {
  if (!data || typeof data !== 'object') {
    throw new ApiError(
      'Invalid API response: not an object',
      ApiErrorCode.INVALID_RESPONSE
    );
  }

  const response = data as Record<string, unknown>;

  // Check for required top-level properties
  if (!response.time || !response.bpi) {
    throw new ApiError(
      'Invalid API response: missing required properties',
      ApiErrorCode.INVALID_RESPONSE
    );
  }

  // Check for USD property in bpi
  const bpi = response.bpi as Record<string, unknown>;
  if (!bpi.USD) {
    throw new ApiError(
      'Invalid API response: missing USD data',
      ApiErrorCode.INVALID_RESPONSE
    );
  }

  // Check for rate_float in USD
  const usd = bpi.USD as Record<string, unknown>;
  if (typeof usd.rate_float !== 'number') {
    throw new ApiError(
      'Invalid API response: missing or invalid rate_float',
      ApiErrorCode.INVALID_RESPONSE
    );
  }
}

/**
 * Fetches the current Bitcoin price from the CoinDesk API
 * @returns Promise resolving to PriceData with current Bitcoin price
 * @throws ApiError if the request fails or returns invalid data
 */
export async function fetchBtcPrice(retryAttempt = 0): Promise<PriceData> {
  try {
    // Make the API request
    const response = await fetch(API_URL);

    // Check for HTTP errors
    if (!response.ok) {
      throw new ApiError(
        `HTTP error ${response.status}: ${response.statusText}`,
        ApiErrorCode.HTTP_ERROR,
        response.status
      );
    }

    // Parse the JSON response
    const data = await response.json();

    // Validate the response structure
    validateApiResponse(data);

    // Extract the Bitcoin price
    const btcPrice = data.bpi.USD.rate_float;
    
    // Calculate the satoshi price (1 BTC = 100,000,000 satoshis)
    const satoshiPrice = btcPrice / 100000000;

    // Return the formatted price data
    return {
      usdRate: btcPrice,
      satoshiRate: satoshiPrice,
      fetchedAt: Date.now(),
      source: 'CoinDesk'
    };
  } catch (error) {
    // If it's already an ApiError, rethrow it
    if (error instanceof ApiError) {
      // For HTTP 429 (Too Many Requests) or 5xx errors, retry with exponential backoff
      const isRetryable = 
        (error.code === ApiErrorCode.HTTP_ERROR && 
         (error.statusCode === 429 || (error.statusCode && error.statusCode >= 500))) ||
        error.code === ApiErrorCode.NETWORK_ERROR;
      
      if (isRetryable && retryAttempt < MAX_RETRY_ATTEMPTS) {
        // Calculate delay with exponential backoff
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryAttempt);
        
        // Wait and then retry
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchBtcPrice(retryAttempt + 1);
      }
      
      // If we've exhausted retries or the error isn't retryable, rethrow
      throw error;
    }
    
    // For network errors like connection failures
    if (error instanceof TypeError || error instanceof DOMException) {
      const networkError = new ApiError(
        `Network error: ${error.message}`,
        ApiErrorCode.NETWORK_ERROR
      );
      
      // Retry network errors
      if (retryAttempt < MAX_RETRY_ATTEMPTS) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryAttempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchBtcPrice(retryAttempt + 1);
      }
      
      throw networkError;
    }
    
    // For unknown errors
    throw new ApiError(
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      ApiErrorCode.UNKNOWN_ERROR
    );
  }
}