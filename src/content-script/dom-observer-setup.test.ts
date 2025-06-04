import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createDomObserver } from './dom-observer';
import { 
  mockPriceData,
  mockAnnotationFunction,
  TEST_DEBOUNCE_MS,
  setupLoggerMock,
  setupDomObserverTest,
  cleanupDomObserverTest,
  createMockMutationObserver,
  createMockMutationObserverWithCallback,
  createMockMutationRecord,
  createMockNodeList
} from '../../tests/utils/dom-observer-helpers';

setupLoggerMock();

describe('dom-observer setup and lifecycle', () => {
  beforeEach(setupDomObserverTest);
  afterEach(cleanupDomObserverTest);

  describe('createDomObserver factory', () => {
    it('should create an observer controller with the correct interface', () => {
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes
      );
      
      expect(controller).toBeDefined();
      expect(typeof controller.start).toBe('function');
      expect(typeof controller.stop).toBe('function');
    });
  });
  
  describe('start() method', () => {
    it('should create a MutationObserver and start observing', () => {
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      const mockMutationObserver = createMockMutationObserver();
      
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver
      );
      
      controller.start(mockPriceData);
      
      expect(mockMutationObserver).toHaveBeenCalledTimes(1);
      
      // Access the mock instance through the constructor call
      const constructorCall = vi.mocked(mockMutationObserver).mock.results[0];
      if (constructorCall.type === 'return') {
        const instance = constructorCall.value as { observe: ReturnType<typeof vi.fn> };
        expect(instance.observe).toHaveBeenCalledTimes(1);
        expect(instance.observe).toHaveBeenCalledWith(rootElement, {
          childList: true,
          subtree: true
        });
      }
    });
    
    it('should store price data for later use', () => {
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
  });
  
  describe('stop() method', () => {
    it('should disconnect the MutationObserver and clear timeout', () => {
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      const { MockMutationObserver, getCapturedCallback, mockObserve, mockDisconnect } = createMockMutationObserverWithCallback();
      
      const mockObserver = {
        observe: mockObserve,
        disconnect: mockDisconnect,
        takeRecords: vi.fn().mockReturnValue([])
      } as MutationObserver;
      
      const originalSetTimeout = global.setTimeout;
      const originalClearTimeout = global.clearTimeout;
      const mockTimeoutId = 123;
      global.setTimeout = vi.fn(() => mockTimeoutId);
      const clearTimeoutMock = vi.fn();
      global.clearTimeout = clearTimeoutMock;
      
      try {
        const controller = createDomObserver(
          rootElement,
          mockAnnotationFunction,
          TEST_DEBOUNCE_MS,
          processedNodes,
          MockMutationObserver
        );
        
        controller.start(mockPriceData);
        
        const capturedCallback = getCapturedCallback();
        if (capturedCallback) {
          const testNode = document.createElement('div');
          const records: MutationRecord[] = [createMockMutationRecord({
            target: rootElement,
            addedNodes: createMockNodeList([testNode])
          })];
          
          capturedCallback(records, mockObserver);
          expect(global.setTimeout).toHaveBeenCalled();
          
          controller.stop();
          
          expect(mockDisconnect).toHaveBeenCalledTimes(1);
          expect(clearTimeoutMock).toHaveBeenCalledWith(mockTimeoutId);
        }
      } finally {
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
      }
    });
  });
});