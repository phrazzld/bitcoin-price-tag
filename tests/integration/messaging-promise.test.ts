/**
 * Test for promise-based messaging pattern
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { PriceRequestMessage, PriceResponseMessage } from '../../src/common/types';

describe('Promise-based Messaging Test', () => {
  let mockChrome: any;
  let messageListeners: Array<(message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void>;
  
  beforeEach(() => {
    vi.resetModules();
    messageListeners = [];
    
    // Create a mock Chrome runtime that simulates the actual behavior
    mockChrome = {
      runtime: {
        onMessage: {
          addListener: vi.fn((listener) => {
            messageListeners.push(listener);
          }),
          removeListener: vi.fn((listener) => {
            const index = messageListeners.indexOf(listener);
            if (index > -1) {
              messageListeners.splice(index, 1);
            }
          }),
        },
        sendMessage: vi.fn((message: any) => {
          // Simulate Chrome's behavior: send to all listeners
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              let handled = false;
              let response: any;
              
              // Call all registered listeners
              for (const listener of messageListeners) {
                const mockSender = { id: 'test-extension-id', tab: { id: 123 } };
                let sendResponseCalled = false;
                
                const sendResponse = (res: any) => {
                  if (!sendResponseCalled) {
                    sendResponseCalled = true;
                    response = res;
                    handled = true;
                  }
                };
                
                const result = listener(message, mockSender, sendResponse);
                
                // If listener returns true, wait for async response
                if (result === true) {
                  // In real Chrome, this would wait, but for testing we'll resolve immediately
                  setTimeout(() => {
                    if (handled) {
                      resolve(response);
                    } else {
                      reject(new Error('No response received'));
                    }
                  }, 10);
                  return;
                }
              }
              
              // If no listener handled it synchronously
              if (handled) {
                resolve(response);
              } else {
                reject(new Error('No handler for message'));
              }
            }, 0);
          });
        }),
        lastError: null,
      },
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn(),
        },
      },
    };
    
    vi.stubGlobal('chrome', mockChrome);
    vi.stubGlobal('fetch', vi.fn());
  });
  
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  
  it('should handle the content script messaging pattern', async () => {
    // First, set up the service worker listener
    const handleMessage = (
      message: any,
      sender: any,
      sendResponse: (response: any) => void
    ): boolean => {
      if (message.type === 'PRICE_REQUEST') {
        // Simulate async response
        setTimeout(() => {
          sendResponse({
            requestId: message.requestId,
            type: 'PRICE_RESPONSE',
            status: 'success',
            data: {
              usdRate: 50000,
              satoshiRate: 0.00002,
              fetchedAt: Date.now(),
              source: 'CoinDesk',
            },
            timestamp: Date.now(),
          });
        }, 10);
        return true; // Will respond asynchronously
      }
      return false;
    };
    
    // Register the service worker handler
    mockChrome.runtime.onMessage.addListener(handleMessage);
    
    // Now simulate the content script sending a message
    const request: PriceRequestMessage = {
      requestId: 'test-123',
      type: 'PRICE_REQUEST',
      timestamp: Date.now(),
    };
    
    // This simulates what the content script does
    const responsePromise = new Promise<PriceResponseMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, 1000);
      
      const handleResponse = (message: any) => {
        if (message.type === 'PRICE_RESPONSE' && message.requestId === request.requestId) {
          clearTimeout(timeout);
          mockChrome.runtime.onMessage.removeListener(handleResponse);
          resolve(message);
        }
      };
      
      mockChrome.runtime.onMessage.addListener(handleResponse);
      
      // Send the message
      mockChrome.runtime.sendMessage(request).catch((error) => {
        clearTimeout(timeout);
        mockChrome.runtime.onMessage.removeListener(handleResponse);
        reject(error);
      });
    });
    
    const response = await responsePromise;
    expect(response.status).toBe('success');
    expect(response.data?.usdRate).toBe(50000);
  });
}); 