/**
 * Typed error classes for the Bitcoin Price Tag Chrome extension
 * 
 * This module provides a comprehensive error handling system with:
 * - Strongly typed error classes with error codes
 * - Rich debugging context without exposing sensitive data
 * - Error chaining for root cause analysis
 * - Proper serialization for cross-context communication
 * - Type guards for error identification
 * 
 * Usage:
 * ```typescript
 * import { ApiError, ApiErrorCode, createApiError } from '@/shared/errors';
 * 
 * // Direct creation
 * throw new ApiError(ApiErrorCode.HTTP_ERROR, 'Server error', {
 *   context: { statusCode: 500 }
 * });
 * 
 * // Factory creation
 * const error = createApiError(originalError, { endpoint: '/api/data' });
 * ```
 */

// Base error infrastructure
export {
  BaseError,
  IBaseError,
  ErrorOptions,
  SerializedError
} from './base-error';

// API errors
export {
  ApiError,
  ApiErrorCode,
  ApiErrorContext,
  createApiError
} from './api-error';

// Validation errors
export {
  ValidationError,
  ValidationErrorCode,
  ValidationErrorContext,
  ValidationErrorParams,
  createValidationError
} from './validation-error';

// Chrome API errors
export {
  ChromeApiError,
  ChromeErrorCode,
  ChromeApiErrorContext,
  createChromeApiError
} from './chrome-api-error';

// Cache errors
export {
  CacheError,
  CacheErrorCode,
  CacheErrorContext,
  CacheErrorParams,
  createCacheError
} from './cache-error';

// Messaging errors
export {
  MessagingError,
  MessagingErrorCode,
  MessagingErrorContext,
  MessagingErrorParams,
  PriceRequestTimeoutError,
  createMessagingError
} from './messaging-error';

// Serialization utilities
export {
  serializeError,
  deserializeError,
  sanitizeForLogging
} from './serialization';

// Type guards
export {
  isBaseError,
  isApiError,
  isValidationError,
  isChromeApiError,
  isCacheError,
  isMessagingError,
  isSerializedError,
  getErrorCode,
  getErrorContext,
  hasErrorCode,
  isRetryableError,
  isQuotaError,
  hasErrorCause,
  hasErrorContext
} from './guards';

// Legacy compatibility exports
// These maintain backward compatibility with existing error usage
export { ApiError as NetworkError } from './api-error';
export { PriceRequestTimeoutError } from './messaging-error';

/**
 * Common error factory functions for frequently used patterns
 */

import { ApiError, ApiErrorCode } from './api-error';
import { ValidationError, ValidationErrorCode } from './validation-error';
import { ChromeApiError, ChromeErrorCode } from './chrome-api-error';

/**
 * Creates a network error for connection failures
 */
export function createNetworkError(message: string, endpoint?: string): ApiError {
  return new ApiError(ApiErrorCode.NETWORK_ERROR, message, {
    context: { endpoint }
  });
}

/**
 * Creates a timeout error for request timeouts
 */
export function createTimeoutError(message: string, timeoutMs?: number): ApiError {
  return new ApiError(ApiErrorCode.TIMEOUT_ERROR, message, {
    context: { timeout: timeoutMs }
  });
}

/**
 * Creates a validation error for type mismatches
 */
export function createTypeError(field: string, expected: string, received: string): ValidationError {
  return new ValidationError(
    ValidationErrorCode.INVALID_TYPE,
    `Field '${field}' expected ${expected} but received ${received}`,
    {
      context: { field, expectedType: expected, receivedType: received }
    }
  );
}

/**
 * Creates a Chrome runtime error
 */
export function createRuntimeError(message: string, api?: string): ChromeApiError {
  return new ChromeApiError(ChromeErrorCode.RUNTIME_ERROR, message, {
    context: { api }
  });
}