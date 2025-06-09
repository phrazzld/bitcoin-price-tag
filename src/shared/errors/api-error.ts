/**
 * API error class and utilities for handling network and HTTP errors
 */

import { BaseError, ErrorOptions } from './base-error';

/**
 * Error codes for API-related errors
 */
export enum ApiErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',           // Connection failures, DNS issues
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',           // Request timeout exceeded
  HTTP_ERROR = 'HTTP_ERROR',                 // 4xx/5xx HTTP status codes
  INVALID_RESPONSE = 'INVALID_RESPONSE',     // Malformed or unexpected response
  RATE_LIMITED = 'RATE_LIMITED',             // API rate limiting
  UNAUTHORIZED = 'UNAUTHORIZED',             // Authentication/authorization failures
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE' // API maintenance or outages
}

/**
 * API error context interface
 */
export interface ApiErrorContext {
  readonly endpoint?: string;
  readonly method?: string;
  readonly statusCode?: number;
  readonly statusText?: string;
  readonly responseHeaders?: Record<string, string>;
  readonly retryAttempt?: number;
  readonly maxRetries?: number;
  readonly timeout?: number;
  readonly [key: string]: unknown;
}

/**
 * Error class for API and network-related errors
 * 
 * Includes HTTP status codes, endpoints, and retry context
 */
export class ApiError extends BaseError {

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: ErrorOptions & { context?: ApiErrorContext }
  ) {
    super(code, message, options);
  }

  /**
   * Checks if the error is retryable based on the error code
   */
  isRetryable(): boolean {
    const retryableCodes = new Set([
      ApiErrorCode.NETWORK_ERROR,
      ApiErrorCode.TIMEOUT_ERROR,
      ApiErrorCode.RATE_LIMITED,
      ApiErrorCode.SERVICE_UNAVAILABLE
    ]);
    
    return retryableCodes.has(this.code as ApiErrorCode);
  }

  /**
   * Gets the HTTP status code from the error context
   */
  getStatusCode(): number | undefined {
    return (this.context as ApiErrorContext)?.statusCode;
  }
}

/**
 * Factory function to create ApiError from various error sources
 * 
 * @param error The original error
 * @param context Additional context about the API call
 * @returns ApiError instance with appropriate code
 */
export function createApiError(
  error: Error | { message: string },
  context?: ApiErrorContext
): ApiError {
  const message = error instanceof Error ? error.message : error.message;
  const lowerMessage = message.toLowerCase();
  
  // Determine error code based on error message and context
  let code: ApiErrorCode;
  
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    code = ApiErrorCode.TIMEOUT_ERROR;
  } else if (lowerMessage.includes('network') || 
             lowerMessage.includes('econnrefused') ||
             lowerMessage.includes('enotfound')) {
    code = ApiErrorCode.NETWORK_ERROR;
  } else if (context?.statusCode && context.statusCode >= 400) {
    if (context.statusCode === 401 || context.statusCode === 403) {
      code = ApiErrorCode.UNAUTHORIZED;
    } else if (context.statusCode === 429) {
      code = ApiErrorCode.RATE_LIMITED;
    } else if (context.statusCode === 503) {
      code = ApiErrorCode.SERVICE_UNAVAILABLE;
    } else {
      code = ApiErrorCode.HTTP_ERROR;
    }
  } else {
    code = ApiErrorCode.NETWORK_ERROR;
  }
  
  // Create appropriate message
  let errorMessage = message;
  if (context?.statusCode) {
    errorMessage = `HTTP ${context.statusCode}: ${message}`;
  }
  
  return new ApiError(code, errorMessage, {
    cause: error instanceof Error ? error : undefined,
    context
  });
}