import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createDomObserver } from './dom-observer';
import { 
  mockPriceData,
  mockAnnotationFunction,
  TEST_DEBOUNCE_MS,
  setupLoggerMock,
  setupDomObserverTest,
  cleanupDomObserverTest,
  createMockMutationObserverWithCallback,
  createMockMutationRecord,
  createMockNodeList
} from '../../tests/utils/dom-observer-helpers';

setupLoggerMock();

describe('dom-observer mutation handling', () => {
  beforeEach(setupDomObserverTest);
  afterEach(cleanupDomObserverTest);

  describe('handleMutationsCallback', () => {
    it('should collect added nodes from mutations', () => {
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      const testNode = document.createElement('span');
      
      const { MockMutationObserver, getCapturedCallback, mockObserve, mockDisconnect } = createMockMutationObserverWithCallback();
      
      const mockObserver = {
        observe: mockObserve,
        disconnect: mockDisconnect,
        takeRecords: vi.fn().mockReturnValue([])
      } as MutationObserver;
      
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        MockMutationObserver
      );
      
      controller.start(mockPriceData);
      
      const records: MutationRecord[] = [createMockMutationRecord({
        target: rootElement,
        addedNodes: createMockNodeList([testNode])
      })];
      
      const mutationCallback = getCapturedCallback();
      expect(mutationCallback).not.toBeNull();
      
      if (mutationCallback) {
        mutationCallback(records, mockObserver);
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        expect(mockAnnotationFunction).toHaveBeenCalledWith(
          testNode,
          mockPriceData,
          processedNodes
        );
      }
    });

    it('should ignore mutations with no added nodes', () => {
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      const { MockMutationObserver, getCapturedCallback, mockObserve, mockDisconnect } = createMockMutationObserverWithCallback();
      
      const mockObserver = {
        observe: mockObserve,
        disconnect: mockDisconnect,
        takeRecords: vi.fn().mockReturnValue([])
      } as MutationObserver;
      
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        MockMutationObserver
      );
      
      controller.start(mockPriceData);
      
      const records: MutationRecord[] = [createMockMutationRecord({
        target: rootElement,
        addedNodes: createMockNodeList([])
      })];
      
      const mutationCallback = getCapturedCallback();
      if (mutationCallback) {
        mutationCallback(records, mockObserver);
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        expect(mockAnnotationFunction).not.toHaveBeenCalled();
      }
    });

    it('should handle empty mutations array', () => {
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      const { MockMutationObserver, getCapturedCallback, mockObserve, mockDisconnect } = createMockMutationObserverWithCallback();
      
      const mockObserver = {
        observe: mockObserve,
        disconnect: mockDisconnect,
        takeRecords: vi.fn().mockReturnValue([])
      } as MutationObserver;
      
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        MockMutationObserver
      );
      
      controller.start(mockPriceData);
      
      const mutationCallback = getCapturedCallback();
      if (mutationCallback) {
        mutationCallback([], mockObserver);
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        expect(mockAnnotationFunction).not.toHaveBeenCalled();
      }
    });
  });
});