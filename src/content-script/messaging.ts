/**
 * Content script messaging module for communicating with the service worker
 */

import { PriceData, PriceRequestMessage, PriceResponseMessage } from '../common/types';
import { createLogger } from '../shared/logger';
import {
  isObject,
  isValidTimestamp,
  hasOnlyExpectedProperties,
  hasRequiredProperties
} from '../common/validation-helpers';

/** 
 * Logger instance for this module
 * Used for tracking message flow and debugging communication issues
 */
const logger = createLogger('content-script/messaging');

/** 
 * Default timeout for price data requests in milliseconds
 * Prevents indefinite waiting if service worker doesn't respond
 */
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Error thrown when a price request times out
 */
export class PriceRequestTimeoutError extends Error {
  constructor(requestId: string) {
    super(`Price request timed out after ${REQUEST_TIMEOUT_MS}ms (requestId: ${requestId})`);
    this.name = 'PriceRequestTimeoutError';
  }
}

/**
 * Error thrown when the service worker returns an error response
 */
export class PriceRequestError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'PriceRequestError';
    this.code = code;
  }
}

/**
 * Generates a unique request ID for message correlation
 * Uses crypto.randomUUID when available, falls back to timestamp + random
 * @returns Unique identifier string for the request
 */
function generateRequestId(): string {
  // Use crypto.randomUUID if available, otherwise fallback to timestamp + random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Requests Bitcoin price data from the service worker
 * @param timeoutMs Optional custom timeout in milliseconds
 * @returns Promise resolving to PriceData
 * @throws PriceRequestTimeoutError if the request times out
 * @throws PriceRequestError if the service worker returns an error
 */
export async function requestPriceData(timeoutMs = REQUEST_TIMEOUT_MS): Promise<PriceData> {
  const requestId = generateRequestId();
  
  // Create the request message
  const request: PriceRequestMessage = {
    requestId,
    type: 'PRICE_REQUEST',
    timestamp: Date.now()
  };

  logger.info('Sending price request to service worker', {
    function_name: 'requestPriceData',
    requestId,
    timeoutMs
  });

  return new Promise<PriceData>((resolve, reject) => {
    // Set up timeout
    const timeoutId = setTimeout(() => {
      logger.warn('Price request timed out', {
        function_name: 'requestPriceData',
        requestId,
        timeoutMs
      });
      reject(new PriceRequestTimeoutError(requestId));
    }, timeoutMs) as unknown as number;
    
    // Send the request with callback to receive response
    chrome.runtime.sendMessage(request, (response: unknown) => {
      // Clear the timeout
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      
      // Check for Chrome runtime errors
      if (chrome.runtime.lastError) {
        logger.error('Chrome runtime error', new Error(chrome.runtime.lastError.message), {
          function_name: 'requestPriceData',
          requestId
        });
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      // Type check the response
      if (!isPriceResponseMessage(response)) {
        logger.error('Invalid response format', new Error('Response does not match expected format'), {
          function_name: 'requestPriceData',
          requestId,
          response
        });
        reject(new Error('Invalid response format'));
        return;
      }
      
      // Check if this response is for our request
      if (response.requestId !== requestId) {
        logger.error('Response requestId mismatch', new Error('Response ID does not match request ID'), {
          function_name: 'requestPriceData',
          requestId,
          responseId: response.requestId
        });
        reject(new Error('Response requestId mismatch'));
        return;
      }
      
      // Handle the response based on status
      if (response.status === 'success' && response.data) {
        logger.info('Price request successful', {
          function_name: 'requestPriceData',
          requestId,
          responseTime: response.timestamp - request.timestamp,
          priceData: {
            usdRate: response.data.usdRate,
            fetchedAt: response.data.fetchedAt,
            source: response.data.source
          }
        });
        resolve(response.data);
      } else if (response.status === 'error' && response.error) {
        logger.error('Price request failed', new PriceRequestError(response.error.message, response.error.code), {
          function_name: 'requestPriceData',
          requestId,
          errorCode: response.error.code
        });
        reject(new PriceRequestError(response.error.message, response.error.code));
      } else {
        logger.error('Invalid response status', new Error('Response has neither success nor error status'), {
          function_name: 'requestPriceData',
          requestId,
          status: response.status
        });
        reject(new Error('Invalid response format'));
      }
    });
  });
}

/**
 * Type guard to check if value is a valid status
 */
function isValidStatus(value: unknown): value is 'success' | 'error' {
  return value === 'success' || value === 'error';
}

/**
 * Type guard to check if value is a valid request ID
 */
function isValidRequestId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard to check if value is valid PriceData
 */
function isValidPriceData(value: unknown): value is PriceData {
  if (!isObject(value)) return false;
  
  const requiredProps = ['usdRate', 'satoshiRate', 'fetchedAt', 'source'];
  if (!hasRequiredProperties(value, requiredProps)) return false;
  if (!hasOnlyExpectedProperties(value, requiredProps)) return false;
  
  return (
    typeof value.usdRate === 'number' && value.usdRate > 0 &&
    typeof value.satoshiRate === 'number' && value.satoshiRate > 0 &&
    isValidTimestamp(value.fetchedAt) &&
    typeof value.source === 'string' && value.source.length > 0
  );
}

/**
 * Type guard to check if value is valid error object
 */
function isValidError(value: unknown): value is { message: string; code: string } {
  if (!isObject(value)) return false;
  
  const requiredProps = ['message', 'code'];
  if (!hasRequiredProperties(value, requiredProps)) return false;
  if (!hasOnlyExpectedProperties(value, requiredProps)) return false;
  
  return (
    typeof value.message === 'string' && value.message.length > 0 &&
    typeof value.code === 'string' && value.code.length > 0
  );
}

/**
 * Type guard to check if a message is a PriceResponseMessage
 * @internal Exported for testing only
 */
export function isPriceResponseMessage(message: unknown): message is PriceResponseMessage {
  if (!isObject(message)) return false;
  
  const requiredProps = ['requestId', 'type', 'status', 'timestamp'];
  if (!hasRequiredProperties(message, requiredProps)) return false;
  
  // Check core properties
  if (message.type !== 'PRICE_RESPONSE') return false;
  if (!isValidRequestId(message.requestId)) return false;
  if (!isValidStatus(message.status)) return false;
  if (!isValidTimestamp(message.timestamp)) return false;
  
  // Check optional properties based on status
  if (message.status === 'success') {
    if (!('data' in message) || !isValidPriceData(message.data)) return false;
    // Success responses should not have error property
    if ('error' in message) return false;
    
    const allowedProps = ['requestId', 'type', 'status', 'timestamp', 'data'];
    if (!hasOnlyExpectedProperties(message, allowedProps)) return false;
  } else {
    // status === 'error'
    if (!('error' in message) || !isValidError(message.error)) return false;
    // Error responses should not have data property
    if ('data' in message) return false;
    
    const allowedProps = ['requestId', 'type', 'status', 'timestamp', 'error'];
    if (!hasOnlyExpectedProperties(message, allowedProps)) return false;
  }
  
  return true;
}