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

describe('dom-observer node filtering', () => {
  beforeEach(setupDomObserverTest);
  afterEach(cleanupDomObserverTest);

  describe('node filtering', () => {
    it('should filter out non-Element nodes and script/style elements', () => {
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
      
      // Create various node types
      const textNode = document.createTextNode('Some text');
      const divElement = document.createElement('div');
      const scriptElement = document.createElement('script');
      const styleElement = document.createElement('style');
      const spanElement = document.createElement('span');
      
      const records: MutationRecord[] = [createMockMutationRecord({
        target: rootElement,
        addedNodes: createMockNodeList([textNode, divElement, scriptElement, styleElement, spanElement])
      })];
      
      const mutationCallback = getCapturedCallback();
      if (mutationCallback) {
        mutationCallback(records);
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        // Should only call annotation function for div and span elements
        // Text nodes, script, and style elements should be filtered out
        expect(mockAnnotationFunction).toHaveBeenCalledTimes(2);
        expect(mockAnnotationFunction).toHaveBeenCalledWith(divElement, mockPriceData, processedNodes);
        expect(mockAnnotationFunction).toHaveBeenCalledWith(spanElement, mockPriceData, processedNodes);
      }
    });

    it('should handle mixed valid and invalid nodes', () => {
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
      
      const validElement = document.createElement('p');
      const commentNode = document.createComment('Comment');
      
      const records: MutationRecord[] = [createMockMutationRecord({
        target: rootElement,
        addedNodes: createMockNodeList([validElement, commentNode])
      })];
      
      const mutationCallback = getCapturedCallback();
      if (mutationCallback) {
        mutationCallback(records);
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        // Should only call for the valid element
        expect(mockAnnotationFunction).toHaveBeenCalledTimes(1);
        expect(mockAnnotationFunction).toHaveBeenCalledWith(validElement, mockPriceData, processedNodes);
      }
    });
  });
});