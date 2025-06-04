import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createDomObserver } from './dom-observer';
import { 
  mockPriceData,
  mockAnnotationFunction,
  TEST_DEBOUNCE_MS,
  setupLoggerMock,
  setupDomObserverTest,
  cleanupDomObserverTest
} from '../../tests/utils/dom-observer-helpers';

setupLoggerMock();

describe('dom-observer debouncing mechanism', () => {
  beforeEach(setupDomObserverTest);
  afterEach(cleanupDomObserverTest);

  describe('debouncing mechanism', () => {
    it('should debounce rapid mutations', () => {
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      let mutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
      
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(function(callback: MutationCallback) {
        mutationCallback = callback;
        return {
          observe: mockObserve,
          disconnect: vi.fn()
        };
      });
      
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as unknown as typeof MutationObserver
      );
      
      controller.start(mockPriceData);
      
      expect(mutationCallback).not.toBeNull();
      
      if (mutationCallback) {
        const createMutationRecord = (node: Node): MutationRecord => ({
          type: 'childList',
          target: rootElement,
          addedNodes: {
            length: 1,
            0: node,
            [Symbol.iterator]: function* () { yield this[0]; }
          } as unknown as NodeList,
          removedNodes: { 
            length: 0, 
            [Symbol.iterator]: function* () {} 
          } as unknown as NodeList,
          previousSibling: null,
          nextSibling: null,
          attributeName: null,
          attributeNamespace: null,
          oldValue: null
        });
        
        const node1 = document.createElement('div');
        mutationCallback([createMutationRecord(node1)]);
        
        vi.advanceTimersByTime(100); // Less than debounce time
        const node2 = document.createElement('span');
        mutationCallback([createMutationRecord(node2)]);
        
        vi.advanceTimersByTime(100); // Still less than debounce time
        const node3 = document.createElement('p');
        mutationCallback([createMutationRecord(node3)]);
        
        expect(setTimeoutSpy).toHaveBeenCalledTimes(3);
        expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
        
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        expect(mockAnnotationFunction).toHaveBeenCalledTimes(3);
      }
    });
  });
});