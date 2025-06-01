/**
 * Chrome Runtime Harness for testing extension messaging
 * This harness simulates Chrome's runtime messaging environment to enable
 * integration testing without mocking internal application modules
 */

import { vi } from 'vitest';
import type { Runtime } from '@types/chrome';

type MessageListener = (
  message: any,
  sender: Runtime.MessageSender,
  sendResponse: (response?: any) => void
) => boolean | void;

interface ListenerInfo {
  listener: MessageListener;
  context: 'service-worker' | 'content-script';
}

export class ChromeRuntimeHarness {
  private listeners: ListenerInfo[] = [];
  private currentContext: 'service-worker' | 'content-script' | null = null;
  private lastError: Error | null = null;
  private messageCounter = 0;

  /**
   * Get the mock Chrome API object
   */
  getMockChromeApi() {
    return {
      runtime: {
        sendMessage: this.sendMessage.bind(this),
        onMessage: {
          addListener: this.addListener.bind(this),
          removeListener: this.removeListener.bind(this),
        },
        onInstalled: {
          addListener: vi.fn(),
        },
        onStartup: {
          addListener: vi.fn(),
        },
        lastError: this.lastError,
        id: 'test-extension-id',
      },
      // Additional Chrome APIs can be added as needed
      alarms: {
        create: vi.fn(),
        clear: vi.fn(),
        onAlarm: {
          addListener: vi.fn(),
        },
      },
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn(),
          remove: vi.fn(),
          clear: vi.fn(),
        },
      },
    };
  }

  /**
   * Set the current context for listener registration
   * Must be called before loading service worker or content script modules
   */
  setContext(context: 'service-worker' | 'content-script') {
    this.currentContext = context;
  }

  /**
   * Reset the harness state between tests
   */
  reset() {
    this.listeners = [];
    this.currentContext = null;
    this.lastError = null;
    this.messageCounter = 0;
  }

  /**
   * Add a message listener for the current context
   */
  private addListener(listener: MessageListener) {
    if (!this.currentContext) {
      throw new Error('Context must be set before adding listeners');
    }

    this.listeners.push({
      listener,
      context: this.currentContext,
    });
    
    console.log(`[Harness] Added listener for ${this.currentContext}, total listeners: ${this.listeners.length}`);
  }

  /**
   * Remove a message listener
   */
  private removeListener(listener: MessageListener) {
    this.listeners = this.listeners.filter(
      (info) => info.listener !== listener
    );
  }

  /**
   * Send a message and route to appropriate listeners
   */
  private sendMessage(
    message: any,
    responseCallback?: (response: any) => void
  ): Promise<any> {
    this.lastError = null;

    // If responseCallback is provided, use callback-style API
    if (responseCallback) {
      this.sendMessageWithCallback(message, responseCallback);
      return Promise.resolve();
    }

    // Otherwise, return a Promise
    return new Promise((resolve, reject) => {
      this.sendMessageWithCallback(message, (response) => {
        if (this.lastError) {
          reject(this.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Internal method to handle message sending with callback
   */
  private sendMessageWithCallback(
    message: any,
    responseCallback: (response: any) => void
  ): void {
    this.lastError = null;
    const messageId = ++this.messageCounter;

    // Determine source and target contexts
    const sourceContext = this.currentContext;
    const targetContext = sourceContext === 'service-worker' 
      ? 'content-script' 
      : 'service-worker';

    console.log(`[Harness] Sending message from ${sourceContext} to ${targetContext}, message:`, message);

    // Find listeners for the target context
    const targetListeners = this.listeners.filter(
      (info) => info.context === targetContext
    );
    
    console.log(`[Harness] Found ${targetListeners.length} listeners for ${targetContext}`);

    if (targetListeners.length === 0) {
      // No listeners registered
      this.lastError = new Error('Could not establish connection. Receiving end does not exist.');
      
      // Chrome calls the callback with undefined when there's an error
      setTimeout(() => responseCallback(undefined), 0);
      return;
    }

    // Create sender object
    const sender: Runtime.MessageSender = {
      id: 'test-extension-id',
    };

    if (sourceContext === 'content-script') {
      sender.tab = {
        id: 123,
        index: 0,
        windowId: 1,
        highlighted: true,
        active: true,
        pinned: false,
        incognito: false,
      };
    }

    // Process message with each listener
    let responseHandled = false;
    let asyncResponseExpected = false;

    targetListeners.forEach(({ listener }) => {
      let sendResponseCalled = false;
      
      const sendResponse = (response?: any) => {
        if (sendResponseCalled) {
          console.warn('sendResponse called multiple times for message:', messageId);
          return;
        }
        
        sendResponseCalled = true;
        responseHandled = true;
        
        console.log(`[Harness] sendResponse called with:`, response);

        // Simulate async callback
        setTimeout(() => {
          console.log(`[Harness] Calling responseCallback with:`, response);
          responseCallback(response);
        }, 0);
      };

      try {
        const result = listener(message, sender, sendResponse);
        
        // If listener returns true, it will call sendResponse asynchronously
        if (result === true) {
          asyncResponseExpected = true;
        }
      } catch (error) {
        console.error('Error in message listener:', error);
        this.lastError = error as Error;
      }
    });

    // If no async response is expected and none was sent, call callback with undefined
    if (!asyncResponseExpected && !responseHandled) {
      setTimeout(() => responseCallback(undefined), 0);
    }
  }

  /**
   * Get the current last error (for testing)
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Wait for any pending async operations
   */
  async waitForPendingOperations(): Promise<void> {
    // Give async operations a chance to complete
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}