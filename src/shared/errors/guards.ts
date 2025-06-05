/**
 * Type guard functions for error identification and type narrowing
 */

import { IBaseError, SerializedError } from './base-error';
import { ApiError, ApiErrorCode } from './api-error';
import { ValidationError, ValidationErrorCode } from './validation-error';
import { ChromeApiError, ChromeErrorCode } from './chrome-api-error';
import { CacheError, CacheErrorCode } from './cache-error';
import { MessagingError, MessagingErrorCode } from './messaging-error';

/**
 * Checks if an object is a BaseError (custom error with our interface)
 */
export function isBaseError(error: unknown): error is IBaseError {
  if (error == null || typeof error !== 'object' || !(error instanceof Error)) {
    return false;
  }
  
  const errorObj = error as unknown as Record<string, unknown>;
  return 'name' in error && typeof errorObj.name === 'string' &&
         'code' in error && typeof errorObj.code === 'string' &&
         'message' in error && typeof errorObj.message === 'string' &&
         'timestamp' in error && typeof errorObj.timestamp === 'string';
}

/**
 * Checks if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError &&
         Object.values(ApiErrorCode).includes(error.code as ApiErrorCode);
}

/**
 * Checks if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError &&
         Object.values(ValidationErrorCode).includes(error.code as ValidationErrorCode);
}

/**
 * Checks if an error is a ChromeApiError
 */
export function isChromeApiError(error: unknown): error is ChromeApiError {
  return error instanceof ChromeApiError &&
         Object.values(ChromeErrorCode).includes(error.code as ChromeErrorCode);
}

/**
 * Checks if an error is a CacheError
 */
export function isCacheError(error: unknown): error is CacheError {
  return error instanceof CacheError &&
         Object.values(CacheErrorCode).includes(error.code as CacheErrorCode);
}

/**
 * Checks if an error is a MessagingError
 */
export function isMessagingError(error: unknown): error is MessagingError {
  return error instanceof MessagingError &&
         Object.values(MessagingErrorCode).includes(error.code as MessagingErrorCode);
}

/**
 * Checks if an object is a serialized error
 */
export function isSerializedError(obj: unknown): obj is SerializedError {
  return obj != null &&
         typeof obj === 'object' &&
         'name' in obj && typeof (obj as Record<string, unknown>).name === 'string' &&
         'message' in obj && typeof (obj as Record<string, unknown>).message === 'string' &&
         'timestamp' in obj && typeof (obj as Record<string, unknown>).timestamp === 'string';
}

/**
 * Safely extracts error code from any error-like object
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isBaseError(error)) {
    return error.code;
  }
  
  if (error && typeof error === 'object' && 'code' in error && typeof (error as Record<string, unknown>).code === 'string') {
    return (error as Record<string, unknown>).code as string;
  }
  
  return undefined;
}

/**
 * Safely extracts error context from any error-like object
 */
export function getErrorContext(error: unknown): Record<string, unknown> | undefined {
  if (isBaseError(error)) {
    return error.context;
  }
  
  if (error && typeof error === 'object' && 'context' in error && error.context) {
    return error.context as Record<string, unknown>;
  }
  
  return undefined;
}

/**
 * Checks if an error has a specific error code
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  return getErrorCode(error) === code;
}

/**
 * Checks if an error is retryable (for ApiError and MessagingError)
 */
export function isRetryableError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.isRetryable();
  }
  
  if (isMessagingError(error) && error.code === (MessagingErrorCode.TIMEOUT_ERROR as string)) {
    return true;
  }
  
  if (isCacheError(error) && error.code === (CacheErrorCode.READ_ERROR as string)) {
    return true;
  }
  
  return false;
}

/**
 * Checks if an error is related to quotas/limits
 */
export function isQuotaError(error: unknown): boolean {
  if (isCacheError(error)) {
    return error.isQuotaError();
  }
  
  if (isChromeApiError(error) && error.code === (ChromeErrorCode.QUOTA_EXCEEDED as string)) {
    return true;
  }
  
  return false;
}

/**
 * Type guard for errors that have a cause (error chain)
 */
export function hasErrorCause(error: unknown): error is IBaseError & { cause: Error } {
  return isBaseError(error) && error.cause instanceof Error;
}

/**
 * Type guard for errors that have context
 */
export function hasErrorContext(error: unknown): error is IBaseError & { context: Record<string, unknown> } {
  return isBaseError(error) && 
         error.context != null && 
         typeof error.context === 'object';
}