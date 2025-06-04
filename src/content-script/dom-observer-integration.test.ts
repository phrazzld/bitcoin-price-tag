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

describe('dom-observer integration and advanced features', () => {
  beforeEach(setupDomObserverTest);
  afterEach(cleanupDomObserverTest);

  describe('error handling', () => {
    it('should handle errors in the annotation function and continue processing', () => {
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Mock annotation function that throws on first call but succeeds on second
      const faultyAnnotationFunction = vi.fn()
        .mockImplementationOnce(() => { throw new Error('Test error'); })
        .mockImplementationOnce(() => {});
      
      const { MockMutationObserver, getCapturedCallback } = createMockMutationObserverWithCallback();
      
      const controller = createDomObserver(
        rootElement,
        faultyAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        MockMutationObserver
      );
      
      controller.start(mockPriceData);
      
      const node1 = document.createElement('div');
      const node2 = document.createElement('span');
      
      const records: MutationRecord[] = [createMockMutationRecord({
        target: rootElement,
        addedNodes: createMockNodeList([node1, node2])
      })];
      
      const mutationCallback = getCapturedCallback();
      if (mutationCallback) {
        mutationCallback(records);
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        // Should be called twice despite the error in first call
        expect(faultyAnnotationFunction).toHaveBeenCalledTimes(2);
      }
    });
  });

  describe('processedNodes sharing', () => {
    it('should share the processedNodes set with the annotation function', () => {
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      const { MockMutationObserver, getCapturedCallback } = createMockMutationObserverWithCallback();
      
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        MockMutationObserver
      );
      
      controller.start(mockPriceData);
      
      const testNode = document.createElement('div');
      
      const records: MutationRecord[] = [createMockMutationRecord({
        target: rootElement,
        addedNodes: createMockNodeList([testNode])
      })];
      
      const mutationCallback = getCapturedCallback();
      if (mutationCallback) {
        mutationCallback(records);
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        expect(mockAnnotationFunction).toHaveBeenCalledWith(
          testNode,
          mockPriceData,
          processedNodes
        );
      }
    });
  });

  describe('functionality validation', () => {
    it('should maintain state across multiple mutation cycles', () => {
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      const { MockMutationObserver, getCapturedCallback } = createMockMutationObserverWithCallback();
      
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
        // First mutation cycle
        const node1 = document.createElement('div');
        mutationCallback([createMockMutationRecord({
          target: rootElement,
          addedNodes: createMockNodeList([node1])
        })]);
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        // Second mutation cycle
        const node2 = document.createElement('span');
        mutationCallback([createMockMutationRecord({
          target: rootElement,
          addedNodes: createMockNodeList([node2])
        })]);
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        expect(mockAnnotationFunction).toHaveBeenCalledTimes(2);
        expect(mockAnnotationFunction).toHaveBeenNthCalledWith(1, node1, mockPriceData, processedNodes);
        expect(mockAnnotationFunction).toHaveBeenNthCalledWith(2, node2, mockPriceData, processedNodes);
      }
    });
  });
});