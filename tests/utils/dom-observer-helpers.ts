/**
 * Shared utilities and helpers for dom-observer tests
 * 
 * This module provides common mock setups, test data, and helper functions
 * used across multiple dom-observer test files to ensure consistency and
 * reduce duplication.
 */

import { vi, expect } from 'vitest';
import { PriceData } from '../../src/common/types';

// Re-export commonly used test utilities
export { 
  createMockNodeList, 
  createMockMutationRecord,
  createMockMutationObserver,
  createMockMutationObserverWithCallback,
  createElement,
  createTextNode
} from './dom-builders';

/**
 * Mock price data for testing
 */
export const mockPriceData: PriceData = {
  usdRate: 30000,
  satoshiRate: 0.0003,
  fetchedAt: Date.now(),
  source: 'CoinGecko'
};

/**
 * Default test parameters
 */
export const TEST_DEBOUNCE_MS = 250;

/**
 * Mock annotation function for testing
 */
export const mockAnnotationFunction = vi.fn();

/**
 * Common logger mock setup
 * This should be called in each test file that needs logger mocking
 */
export const setupLoggerMock = () => {
  vi.mock('../../src/shared/logger', () => ({
    createLogger: () => ({
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    }),
  }));
};

/**
 * Mock performance.now with Node.js 18+ compatible approach
 */
export const mockPerformanceNow = (mockTime: number = 1000) => {
  return vi.spyOn(performance, 'now').mockReturnValue(mockTime);
};

/**
 * Mock performance.now to return a sequence of values
 */
export const mockPerformanceNowSequence = (times: number[]) => {
  const spy = vi.spyOn(performance, 'now');
  times.forEach((time) => {
    spy.mockReturnValueOnce(time);
  });
  return spy;
};

/**
 * Common beforeEach setup for dom-observer tests
 * Sets up mocks, fake timers, and clears state
 */
export const setupDomObserverTest = () => {
  // Reset mocks
  vi.clearAllMocks();
  // Mock performance.now() with Node.js 18+ compatible approach
  mockPerformanceNow(1000);
  // Use fake timers for debouncing tests
  vi.useFakeTimers();
};

/**
 * Common afterEach cleanup for dom-observer tests
 * Restores mocks and timers
 */
export const cleanupDomObserverTest = () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
};

/**
 * Creates a test target element with the specified content
 */
export const createTestTarget = (innerHTML = ''): HTMLElement => {
  const target = document.createElement('div');
  target.innerHTML = innerHTML;
  document.body.appendChild(target);
  return target;
};

/**
 * Creates a mock processedNodes set with optional initial values
 */
export const createMockProcessedNodes = (initialNodes: Node[] = []): Set<Node> => {
  return new Set(initialNodes);
};

/**
 * Helper to create a mutation record with added nodes
 */
export const createAddedNodesMutation = (addedNodes: Node[]): MutationRecord => {
  return {
    type: 'childList',
    target: document.createElement('div'),
    addedNodes: {
      length: addedNodes.length,
      item: (index: number) => addedNodes[index] || null,
      [Symbol.iterator]: function* () {
        for (const node of addedNodes) {
          yield node;
        }
      },
      forEach: (callback: (value: Node, key: number, parent: NodeList) => void) => {
        const nodeList = {
          length: addedNodes.length,
          item: (index: number) => addedNodes[index] || null,
          [Symbol.iterator]: function* () {
            for (const node of addedNodes) {
              yield node;
            }
          },
          forEach: () => {}
        } as NodeList;
        addedNodes.forEach((node, index) => callback(node, index, nodeList));
      }
    } as NodeList,
    removedNodes: {
      length: 0,
      item: () => null,
      [Symbol.iterator]: function* () {},
      forEach: () => {}
    } as NodeList,
    previousSibling: null,
    nextSibling: null,
    attributeName: null,
    attributeNamespace: null,
    oldValue: null
  };
};

/**
 * Helper to create multiple text nodes with price content
 */
export const createPriceTextNodes = (prices: string[]): Text[] => {
  return prices.map(price => {
    const textNode = document.createTextNode(`Price: $${price}`);
    return textNode;
  });
};

/**
 * Helper to verify that an annotation function was called with expected parameters
 */
export const expectAnnotationCall = (
  mockFn: ReturnType<typeof vi.fn>,
  expectedCallCount: number,
  expectedPriceData?: PriceData,
  expectedProcessedNodes?: Set<Node>
) => {
  expect(mockFn).toHaveBeenCalledTimes(expectedCallCount);
  
  if (expectedCallCount > 0 && expectedPriceData) {
    const lastCall = mockFn.mock.calls[expectedCallCount - 1];
    expect(lastCall[1]).toEqual(expectedPriceData); // Second argument should be price data
    
    if (expectedProcessedNodes) {
      expect(lastCall[2]).toBe(expectedProcessedNodes); // Third argument should be processed nodes
    }
  }
};

/**
 * Helper to advance fake timers and flush promises
 */
export const advanceTimersAndFlush = async (ms: number) => {
  vi.advanceTimersByTime(ms);
  await new Promise(resolve => setImmediate(resolve));
};