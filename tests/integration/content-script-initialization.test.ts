/**
 * Integration test for content script initialization flow
 * 
 * This test verifies the initialization sequence in src/content-script/index.ts:
 * 1. Simulates DOMContentLoaded event
 * 2. Mocks messaging.ts (requestPriceData) to control priceData delivery
 * 3. Verifies the correct sequence of operations:
 *    - findAndAnnotatePrices is called on document.body
 *    - createDomObserver is called with correct parameters
 *    - domObserver.start() is invoked
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestPriceData } from '../utils/test-helpers';
import { PriceData } from '../../src/common/types';
import { DOM_OBSERVER_DEBOUNCE_MS } from '../../src/common/constants';

// Mock modules
vi.mock('../../src/content-script/messaging', () => ({
  requestPriceData: vi.fn().mockImplementation(() => Promise.resolve({})),
}));

vi.mock('../../src/content-script/dom', () => ({
  findAndAnnotatePrices: vi.fn(),
}));

vi.mock('../../src/content-script/dom-observer', () => ({
  createDomObserver: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn()
  })),
}));

vi.mock('../../src/shared/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Import mocked modules - must be done outside the describe block due to ESM module rules
import { requestPriceData } from '../../src/content-script/messaging';
import { findAndAnnotatePrices } from '../../src/content-script/dom';
import { createDomObserver } from '../../src/content-script/dom-observer';

describe('Content Script Initialization Flow', () => {
  let mockPriceData: PriceData;
  let originalDocumentReadyState: string;

  beforeEach(() => {
    // Reset modules and mocks
    vi.resetModules();
    vi.clearAllMocks();
    
    // Use fake timers for all tests
    vi.useFakeTimers();
    
    // Save original document.readyState
    originalDocumentReadyState = document.readyState;
    
    // Clean up document.body
    document.body.innerHTML = '';
    
    // Create mock price data
    mockPriceData = createTestPriceData();
    
    // Setup requestPriceData to resolve with mock data
    vi.mocked(requestPriceData).mockResolvedValue(mockPriceData);
  });
  
  afterEach(() => {
    // Restore original values
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => originalDocumentReadyState
    });
    
    // Restore real timers
    vi.useRealTimers();
  });

  it('should initialize when document is already loaded', async () => {
    // Simulate document already loaded
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete'
    });
    
    // Import and execute the content script
    await import('../../src/content-script/index');
    
    // Allow any pending promises to resolve
    await vi.runAllTimersAsync();
    
    // Verify initialization flow
    expect(requestPriceData).toHaveBeenCalledTimes(1);
    expect(findAndAnnotatePrices).toHaveBeenCalledTimes(1);
    expect(findAndAnnotatePrices).toHaveBeenCalledWith(
      document.body,
      mockPriceData,
      expect.any(Set)
    );
    
    expect(createDomObserver).toHaveBeenCalledTimes(1);
    expect(createDomObserver).toHaveBeenCalledWith(
      document.body,
      findAndAnnotatePrices,
      DOM_OBSERVER_DEBOUNCE_MS,
      expect.any(Set)
    );
    
    // Get the controller returned by createDomObserver
    const controller = vi.mocked(createDomObserver).mock.results[0].value;
    expect(controller.start).toHaveBeenCalledTimes(1);
    expect(controller.start).toHaveBeenCalledWith(mockPriceData);
  });

  it('should initialize when DOMContentLoaded event fires', async () => {
    // Simulate document still loading
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'loading'
    });
    
    // Import the content script (this will execute it)
    await import('../../src/content-script/index');
    
    // No initialization should have happened yet
    expect(requestPriceData).not.toHaveBeenCalled();
    
    // Simulate DOMContentLoaded event
    const domContentLoadedEvent = new Event('DOMContentLoaded');
    document.dispatchEvent(domContentLoadedEvent);
    
    // Allow any pending promises to resolve
    await vi.runAllTimersAsync();
    
    // Verify initialization flow happened after DOMContentLoaded
    expect(requestPriceData).toHaveBeenCalledTimes(1);
    expect(findAndAnnotatePrices).toHaveBeenCalledTimes(1);
    expect(findAndAnnotatePrices).toHaveBeenCalledWith(
      document.body,
      mockPriceData,
      expect.any(Set)
    );
    
    expect(createDomObserver).toHaveBeenCalledTimes(1);
    expect(createDomObserver).toHaveBeenCalledWith(
      document.body,
      findAndAnnotatePrices,
      DOM_OBSERVER_DEBOUNCE_MS,
      expect.any(Set)
    );
    
    // Get the controller returned by createDomObserver
    const controller = vi.mocked(createDomObserver).mock.results[0].value;
    expect(controller.start).toHaveBeenCalledTimes(1);
    expect(controller.start).toHaveBeenCalledWith(mockPriceData);
  });

  it('should use the same processedNodes set for findAndAnnotatePrices and createDomObserver', async () => {
    // Simulate document already loaded
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete'
    });
    
    // Import the content script
    await import('../../src/content-script/index');
    
    // Allow any pending promises to resolve
    await vi.runAllTimersAsync();
    
    // Extract the processedNodes set passed to both functions
    const processedNodesPassedToAnnotate = vi.mocked(findAndAnnotatePrices).mock.calls[0][2];
    const processedNodesPassedToObserver = vi.mocked(createDomObserver).mock.calls[0][3];
    
    // Verify it's the same Set instance
    expect(processedNodesPassedToAnnotate).toBe(processedNodesPassedToObserver);
  });

  it('should handle errors when price data fetching fails', async () => {
    // Simulate document already loaded
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete'
    });
    
    // Make requestPriceData fail
    const error = new Error('Network error');
    vi.mocked(requestPriceData).mockRejectedValue(error);
    
    // Import the content script
    await import('../../src/content-script/index');
    
    // Allow any pending promises to resolve
    await vi.runAllTimersAsync();
    
    // Verify error handling
    expect(requestPriceData).toHaveBeenCalledTimes(1);
    
    // No further initialization should happen
    expect(findAndAnnotatePrices).not.toHaveBeenCalled();
    expect(createDomObserver).not.toHaveBeenCalled();
  });
});