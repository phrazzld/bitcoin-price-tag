/**
 * Simple test to debug messaging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChromeRuntimeHarness } from '../harness/ChromeRuntimeHarness';

describe('Simple Messaging Test', () => {
  let harness: ChromeRuntimeHarness;
  
  beforeEach(() => {
    vi.resetModules();
    harness = new ChromeRuntimeHarness();
  });

  it('should test basic message flow', async () => {
    // Set up Chrome API with harness
    const chromeApi = harness.getMockChromeApi() as any;
    vi.stubGlobal('chrome', chromeApi);
    
    // Create a simple listener that responds immediately
    harness.setContext('service-worker');
    chromeApi.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: (response: any) => void) => {
      console.log('[SW] Received message:', message);
      
      if (message.type === 'TEST') {
        sendResponse({ type: 'RESPONSE', data: 'Hello from SW' });
        return true; // Will respond asynchronously
      }
      return false;
    });
    
    // Send a message from content script
    harness.setContext('content-script');
    
    const response = await new Promise((resolve) => {
      chromeApi.runtime.sendMessage({ type: 'TEST' }, (response: any) => {
        console.log('[CS] Received response:', response);
        resolve(response);
      });
    });
    
    expect(response).toEqual({ type: 'RESPONSE', data: 'Hello from SW' });
  });
}); 