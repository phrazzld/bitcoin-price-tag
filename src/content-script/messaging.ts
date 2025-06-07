/**
 * Content script messaging module for communicating with the service worker
 */

import { PriceData, PriceRequestMessage, PriceResponseMessage } from '../common/types';
import { createLogger } from '../shared/logger';
import { SecureValidation } from '../common/schema-validation';

/** 
 * Logger instance for this module
 * Used for tracking message flow and debugging communication issues
 */
const logger = createLogger('content-script/messaging');

/** 
 * Default timeout for price data requests in milliseconds
 * Prevents indefinite waiting if service worker doesn't respond
 * CI environment gets longer timeout due to slower async operations
 */
const REQUEST_TIMEOUT_MS = process.env.CI ? 15000 : 10000; // 15s for CI, 10s locally

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
      
      // Comprehensive security validation of response
      const validationResult = SecureValidation.validateChromeMessage(
        response, 
        { origin: 'service-worker' } as chrome.runtime.MessageSender, 
        'PRICE_RESPONSE'
      );
      
      if (!validationResult.isValid) {
        const primaryError = validationResult.errors[0];
        const errorMessage = primaryError 
          ? `Response validation failed: ${primaryError.message} (${primaryError.code})`
          : 'Invalid response format';
          
        logger.error('Response validation failed', new Error(errorMessage), {
          function_name: 'requestPriceData',
          requestId,
          validationErrors: validationResult.errors.map(err => ({
            path: err.path,
            code: err.code,
            message: err.message
          }))
        });
        reject(new Error(errorMessage));
        return;
      }
      
      const validResponse = validationResult.data as PriceResponseMessage;
      
      // Check if this response is for our request
      if (validResponse.requestId !== requestId) {
        logger.error('Response requestId mismatch', new Error('Response ID does not match request ID'), {
          function_name: 'requestPriceData',
          requestId,
          responseId: validResponse.requestId
        });
        reject(new Error('Response requestId mismatch'));
        return;
      }
      
      // Handle the response based on status
      if (validResponse.status === 'success' && validResponse.data) {
        logger.info('Price request successful', {
          function_name: 'requestPriceData',
          requestId,
          responseTime: validResponse.timestamp - request.timestamp,
          priceData: {
            usdRate: validResponse.data.usdRate,
            fetchedAt: validResponse.data.fetchedAt,
            source: validResponse.data.source
          }
        });
        resolve(validResponse.data);
      } else if (validResponse.status === 'error' && validResponse.error) {
        logger.error('Price request failed', new PriceRequestError(validResponse.error.message, validResponse.error.code), {
          function_name: 'requestPriceData',
          requestId,
          errorCode: validResponse.error.code
        });
        reject(new PriceRequestError(validResponse.error.message, validResponse.error.code));
      } else {
        logger.error('Invalid response status', new Error('Response has neither success nor error status'), {
          function_name: 'requestPriceData',
          requestId,
          status: validResponse.status
        });
        reject(new Error('Invalid response format'));
      }
    });
  });
}

