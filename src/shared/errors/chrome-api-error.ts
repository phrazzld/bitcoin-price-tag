/**
 * Chrome API error class and utilities for handling Chrome extension API failures
 */

import { BaseError, ErrorOptions } from './base-error';

/**
 * Error codes for Chrome API-related errors
 */
export enum ChromeErrorCode {
  RUNTIME_ERROR = 'RUNTIME_ERROR',         // chrome.runtime errors
  STORAGE_ERROR = 'STORAGE_ERROR',         // chrome.storage failures
  PERMISSION_DENIED = 'PERMISSION_DENIED', // Missing permissions
  CONTEXT_INVALID = 'CONTEXT_INVALID',     // Invalid execution context
  API_UNAVAILABLE = 'API_UNAVAILABLE',     // Chrome API not available
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'        // Storage or other quota limits
}

/**
 * Chrome API error context interface
 */
export interface ChromeApiErrorContext {
  readonly api?: string;
  readonly method?: string;
  readonly permissions?: string[];
  readonly manifestVersion?: number;
  readonly key?: string;
  readonly dataSize?: number;
  readonly quotaBytes?: number;
  readonly usedBytes?: number;
  readonly requestedBytes?: number;
  readonly tabId?: number;
  readonly frameId?: number;
  readonly messageType?: string;
  readonly targetContext?: string;
  readonly [key: string]: unknown;
}

/**
 * Error class for Chrome extension API failures
 * 
 * Includes API names, methods, permissions, and Chrome-specific context
 */
export class ChromeApiError extends BaseError {

  constructor(
    code: ChromeErrorCode,
    message: string,
    options?: ErrorOptions & { context?: ChromeApiErrorContext }
  ) {
    super(code, message, options);
  }

  /**
   * Checks if the error is recoverable
   */
  isRecoverable(): boolean {
    const recoverableCodes = new Set([
      ChromeErrorCode.QUOTA_EXCEEDED,
      ChromeErrorCode.STORAGE_ERROR
    ]);
    
    return recoverableCodes.has(this.code as ChromeErrorCode);
  }

  /**
   * Gets the Chrome API name from the error context
   */
  getChromeApi(): string | undefined {
    return (this.context as ChromeApiErrorContext)?.api;
  }
}

/**
 * Factory function to create ChromeApiError from various error sources
 * 
 * @param error The original error (chrome.runtime.lastError or Error)
 * @param context Additional context about the Chrome API call
 * @returns ChromeApiError instance with appropriate code
 */
export function createChromeApiError(
  error: Error | { message: string } | null,
  context?: ChromeApiErrorContext
): ChromeApiError {
  if (!error) {
    return new ChromeApiError(
      ChromeErrorCode.RUNTIME_ERROR,
      'Unknown Chrome API error',
      { context }
    );
  }
  
  const message = error instanceof Error ? error.message : error.message;
  const lowerMessage = message.toLowerCase();
  
  // Determine error code based on error message and context
  let code: ChromeErrorCode;
  
  if (lowerMessage.includes('permission') || lowerMessage.includes('denied')) {
    code = ChromeErrorCode.PERMISSION_DENIED;
  } else if (lowerMessage.includes('quota') || lowerMessage.includes('exceeded')) {
    code = ChromeErrorCode.QUOTA_EXCEEDED;
  } else if (lowerMessage.includes('context') && lowerMessage.includes('invalid')) {
    code = ChromeErrorCode.CONTEXT_INVALID;
  } else if (lowerMessage.includes('storage')) {
    code = ChromeErrorCode.STORAGE_ERROR;
  } else if (lowerMessage.includes('api') && lowerMessage.includes('unavailable')) {
    code = ChromeErrorCode.API_UNAVAILABLE;
  } else {
    code = ChromeErrorCode.RUNTIME_ERROR;
  }
  
  return new ChromeApiError(code, message, {
    cause: error instanceof Error ? error : undefined,
    context
  });
}