/**
 * Content script messaging module for communicating with the service worker
 */

import { PriceData, PriceRequestMessage, PriceResponseMessage } from '../common/types';

/** Default timeout for price data requests in milliseconds */
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

  return new Promise<PriceData>((resolve, reject) => {
    let timeoutId: number | undefined;
    
    // Set up response listener
    const handleResponse = (response: unknown) => {
      // Type check the response
      if (!isPriceResponseMessage(response)) {
        return;
      }
      
      // Check if this response is for our request
      if (response.requestId !== requestId) {
        return;
      }
      
      // Clear the timeout
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      
      // Remove the listener
      chrome.runtime.onMessage.removeListener(handleResponse);
      
      // Handle the response based on status
      if (response.status === 'success' && response.data) {
        resolve(response.data);
      } else if (response.status === 'error' && response.error) {
        reject(new PriceRequestError(response.error.message, response.error.code));
      } else {
        reject(new Error('Invalid response format'));
      }
    };
    
    // Set up timeout
    timeoutId = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(handleResponse);
      reject(new PriceRequestTimeoutError(requestId));
    }, timeoutMs) as unknown as number;
    
    // Add the response listener
    chrome.runtime.onMessage.addListener(handleResponse);
    
    // Send the request
    chrome.runtime.sendMessage(request).catch((error) => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      chrome.runtime.onMessage.removeListener(handleResponse);
      reject(error);
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