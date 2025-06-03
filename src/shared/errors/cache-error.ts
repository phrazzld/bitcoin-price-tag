/**
 * Cache error class and utilities for handling storage and cache failures
 */

import { BaseError, ErrorOptions } from './base-error';

/**
 * Error codes for cache-related errors
 */
export enum CacheErrorCode {
  READ_ERROR = 'READ_ERROR',             // Cache read operation failed
  WRITE_ERROR = 'WRITE_ERROR',           // Cache write operation failed
  INVALID_DATA = 'INVALID_DATA',         // Cached data is corrupted or invalid
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',     // Storage quota exceeded
  EXPIRED_DATA = 'EXPIRED_DATA'          // Cached data has expired
}

/**
 * Cache error context interface
 */
export interface CacheErrorContext {
  readonly key?: string;
  readonly storageType?: 'local' | 'sync' | 'session';
  readonly operation?: 'get' | 'set' | 'remove' | 'clear';
  readonly dataSize?: number;
  readonly quotaBytes?: number;
  readonly usedBytes?: number;
  readonly requestedBytes?: number;
  readonly expirationTime?: string;
  readonly currentTime?: string;
  readonly ttl?: number;
  readonly expectedVersion?: number;
  readonly actualVersion?: number;
  readonly validationErrors?: string[];
  readonly reason?: string;
  readonly [key: string]: unknown;
}

/**
 * Error class for cache and storage failures
 * 
 * Includes storage keys, operations, quota information, and validation details
 */
export class CacheError extends BaseError {

  constructor(
    code: CacheErrorCode,
    message: string,
    options?: ErrorOptions & { context?: CacheErrorContext }
  ) {
    super(code, message, options);
  }

  /**
   * Checks if the error is related to storage quota
   */
  isQuotaError(): boolean {
    return this.code === (CacheErrorCode.QUOTA_EXCEEDED as string);
  }

  /**
   * Gets the storage key from the error context
   */
  getStorageKey(): string | undefined {
    return (this.context as CacheErrorContext)?.key;
  }
}

/**
 * Factory function parameters for creating cache errors
 */
export interface CacheErrorParams {
  readonly operation?: 'get' | 'set' | 'remove' | 'clear';
  readonly key?: string;
  readonly storageType?: 'local' | 'sync' | 'session';
  readonly dataSize?: number;
  readonly reason?: string;
}

/**
 * Factory function to create CacheError from various error sources
 * 
 * @param error The original error
 * @param params Additional context about the cache operation
 * @returns CacheError instance with appropriate code
 */
export function createCacheError(
  error: Error | { message: string },
  params?: CacheErrorParams
): CacheError {
  const message = error instanceof Error ? error.message : error.message;
  const lowerMessage = message.toLowerCase();
  
  // Determine error code based on error message and context
  let code: CacheErrorCode;
  
  if (lowerMessage.includes('quota') || lowerMessage.includes('exceeded')) {
    code = CacheErrorCode.QUOTA_EXCEEDED;
  } else if (lowerMessage.includes('invalid') || 
             lowerMessage.includes('corrupted') || 
             params?.reason?.includes('parse') ||
             params?.reason?.includes('validation')) {
    code = CacheErrorCode.INVALID_DATA;
  } else if (params?.operation === 'get' || lowerMessage.includes('read')) {
    code = CacheErrorCode.READ_ERROR;
  } else if (params?.operation === 'set' || lowerMessage.includes('write')) {
    code = CacheErrorCode.WRITE_ERROR;
  } else {
    // Default based on operation type
    code = params?.operation === 'get' ? CacheErrorCode.READ_ERROR : CacheErrorCode.WRITE_ERROR;
  }
  
  return new CacheError(code, message, {
    cause: error instanceof Error ? error : undefined,
    context: params
  });
}