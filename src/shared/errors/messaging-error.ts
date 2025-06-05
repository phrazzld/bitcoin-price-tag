/**
 * Messaging error class and utilities for cross-context communication failures
 */

import { BaseError, ErrorOptions } from './base-error';

/**
 * Error codes for messaging-related errors
 */
export enum MessagingErrorCode {
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',         // Message request timed out
  SEND_FAILED = 'SEND_FAILED',             // Failed to send message
  INVALID_MESSAGE = 'INVALID_MESSAGE',     // Invalid message format
  INVALID_RESPONSE = 'INVALID_RESPONSE',   // Invalid response format
  CONNECTION_ERROR = 'CONNECTION_ERROR',   // Connection/context error
  HANDLER_ERROR = 'HANDLER_ERROR'          // Message handler error
}

/**
 * Messaging error context interface
 */
export interface MessagingErrorContext {
  readonly messageType?: string;
  readonly requestId?: string;
  readonly targetContext?: 'service-worker' | 'content-script' | 'popup';
  readonly tabId?: number;
  readonly frameId?: number;
  readonly timeoutMs?: number;
  readonly handler?: string;
  readonly originalError?: string;
  readonly reason?: string;
  readonly [key: string]: unknown;
}

/**
 * Error class for cross-context messaging failures
 * 
 * Includes message types, request IDs, timeouts, and context information
 */
export class MessagingError extends BaseError {

  constructor(
    code: MessagingErrorCode,
    message: string,
    options?: ErrorOptions & { context?: MessagingErrorContext }
  ) {
    super(code, message, options);
  }

  /**
   * Checks if the error is a timeout
   */
  isTimeout(): boolean {
    return this.code === (MessagingErrorCode.TIMEOUT_ERROR as string);
  }

  /**
   * Gets the request ID from the error context
   */
  getRequestId(): string | undefined {
    return (this.context as MessagingErrorContext)?.requestId;
  }
}

/**
 * Specialized error for price request timeouts
 * Maintains compatibility with existing PriceRequestTimeoutError
 */
export class PriceRequestTimeoutError extends MessagingError {

  constructor(requestId: string, timeoutMs: number = 10000) {
    super(
      MessagingErrorCode.TIMEOUT_ERROR,
      `Price request timed out after ${timeoutMs}ms (requestId: ${requestId})`,
      {
        context: {
          requestId,
          timeoutMs,
          messageType: 'PRICE_REQUEST'
        }
      }
    );
  }
}

/**
 * Factory function parameters for creating messaging errors
 */
export interface MessagingErrorParams {
  readonly messageType?: string;
  readonly requestId?: string;
  readonly targetContext?: 'service-worker' | 'content-script' | 'popup';
  readonly tabId?: number;
  readonly timeoutMs?: number;
  readonly handler?: string;
  readonly reason?: string;
}

/**
 * Factory function to create MessagingError from various error sources
 * 
 * @param error The original error (chrome.runtime.lastError or Error)
 * @param params Additional context about the messaging operation
 * @returns MessagingError instance with appropriate code
 */
export function createMessagingError(
  error: Error | { message: string },
  params?: MessagingErrorParams
): MessagingError {
  const message = error instanceof Error ? error.message : error.message;
  const lowerMessage = message.toLowerCase();
  
  // Determine error code based on error message and context
  let code: MessagingErrorCode;
  
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    code = MessagingErrorCode.TIMEOUT_ERROR;
  } else if (lowerMessage.includes('connection') || 
             lowerMessage.includes('establish') ||
             lowerMessage.includes('context')) {
    code = MessagingErrorCode.CONNECTION_ERROR;
  } else if (lowerMessage.includes('invalid') && lowerMessage.includes('message')) {
    code = MessagingErrorCode.INVALID_MESSAGE;
  } else if (lowerMessage.includes('invalid') && lowerMessage.includes('response')) {
    code = MessagingErrorCode.INVALID_RESPONSE;
  } else if (lowerMessage.includes('invalid') && 
             (params?.messageType || params?.reason?.includes('type'))) {
    code = MessagingErrorCode.INVALID_MESSAGE;
  } else if (params?.handler) {
    code = MessagingErrorCode.HANDLER_ERROR;
  } else {
    code = MessagingErrorCode.SEND_FAILED;
  }
  
  return new MessagingError(code, message, {
    cause: error instanceof Error ? error : undefined,
    context: params as MessagingErrorContext
  });
}