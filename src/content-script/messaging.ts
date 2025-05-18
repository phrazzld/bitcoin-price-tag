/**
 * Content script messaging module for communicating with the service worker
 */

import { PriceData, PriceRequestMessage, PriceResponseMessage } from '../common/types';
import { createLogger } from '../shared/logger';

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
    let timeoutId: number | undefined;
    
    // Set up timeout
    timeoutId = setTimeout(() => {
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
 * Type guard to check if a message is a PriceResponseMessage
 */
function isPriceResponseMessage(message: unknown): message is PriceResponseMessage {
  return (
    message !== null &&
    typeof message === 'object' &&
    'type' in message &&
    message.type === 'PRICE_RESPONSE' &&
    'requestId' in message &&
    'status' in message &&
    'timestamp' in message
  );
}