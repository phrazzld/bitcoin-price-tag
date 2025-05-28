import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createDomObserver } from './dom-observer';
import { PriceData } from '../common/types';

// Mock the logger to avoid console output in tests
vi.mock('../shared/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

/**
 * Helper function to create mock MutationRecord objects with proper typing
 * This eliminates the need for 'as any' casts when creating test data
 */
function createMockMutationRecord(options: Partial<MutationRecord> = {}): MutationRecord {
  const defaultNodeList = { 
    length: 0, 
    [Symbol.iterator]: function* () {} 
  } as NodeListOf<Node>;
  
  return {
    type: 'childList',
    target: document.createElement('div'),
    addedNodes: defaultNodeList,
    removedNodes: defaultNodeList,
    previousSibling: null,
    nextSibling: null,
    attributeName: null,
    attributeNamespace: null,
    oldValue: null,
    ...options,
  } as MutationRecord;
}

/**
 * Helper function to create a mock NodeListOf<Node> for MutationRecord testing
 */
function createMockNodeList(nodes: Node[]): NodeListOf<Node> {
  const mockNodeList = {
    length: nodes.length,
    [Symbol.iterator]: function* () {
      for (let i = 0; i < nodes.length; i++) {
        yield this[i];
      }
    }
  } as any;
  
  // Add indexed properties
  nodes.forEach((node, index) => {
    mockNodeList[index] = node;
  });
  
  return mockNodeList as NodeListOf<Node>;
}

// Mock price data for testing
const mockPriceData: PriceData = {
  usdRate: 30000,
  satoshiRate: 0.0003,
  fetchedAt: Date.now(),
  source: 'CoinGecko'
};

// Mock annotation function for testing
const mockAnnotationFunction = vi.fn();

// Default test parameters
const TEST_DEBOUNCE_MS = 250;

describe('dom-observer.ts', () => {
  // Setup before each test
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    // Mock performance.now()
    global.performance.now = vi.fn(() => 1000);
    // Use fake timers for debouncing tests
    vi.useFakeTimers();
  });

  // Cleanup after each test
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

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
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Mock MutationObserver
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(() => ({
        observe: mockObserve,
        disconnect: vi.fn()
      }));
      
      // Create observer controller with injected mock constructor
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as any
      );
      
      // Start observing
      controller.start(mockPriceData);
      
      // Verify MutationObserver was created
      expect(mockMutationObserver).toHaveBeenCalledTimes(1);
      
      // Verify observe was called with correct parameters
      expect(mockObserve).toHaveBeenCalledTimes(1);
      expect(mockObserve).toHaveBeenCalledWith(rootElement, {
        childList: true,
        subtree: true
      });
    });
    
    it('should store price data for later use', () => {
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      const testNode = document.createElement('span');
      
      // Mock the MutationObserver to capture the callback
      let mutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
      
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(function(callback) {
        mutationCallback = callback;
        return {
          observe: mockObserve,
          disconnect: vi.fn()
        };
      });
      
      // Create observer controller with injected mock constructor
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as any
      );
      
      // Start observing
      controller.start(mockPriceData);
      
      // Create mutation records
      const records: MutationRecord[] = [createMockMutationRecord({
        target: rootElement,
        addedNodes: createMockNodeList([testNode])
      })];
        
        // Verify callback was captured
        expect(mutationCallback).not.toBeNull();
        
        // Call the mutation callback directly
        if (mutationCallback) {
          mutationCallback(records);
          
          // Fast-forward time to trigger the debounced function
          vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
          
          // The annotation function should be called with the stored price data
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
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Mock MutationObserver
      const mockDisconnect = vi.fn();
      const mockObserve = vi.fn();
      
      // Create a way to capture the mutation callback
      let capturedCallback: Function | null = null;
      const mockMutationObserver = vi.fn(function(callback) {
        capturedCallback = callback;
        return {
          observe: mockObserve,
          disconnect: mockDisconnect
        };
      });
      
      // Mock setTimeout and clearTimeout
      const originalSetTimeout = global.setTimeout;
      const originalClearTimeout = global.clearTimeout;
      const mockTimeoutId = 123;
      global.setTimeout = vi.fn(() => mockTimeoutId);
      const clearTimeoutMock = vi.fn();
      global.clearTimeout = clearTimeoutMock;
      
      try {
        // Create observer controller with injected mock constructor
        const controller = createDomObserver(
          rootElement,
          mockAnnotationFunction,
          TEST_DEBOUNCE_MS,
          processedNodes,
          mockMutationObserver as any
        );
        
        // Start observing
        controller.start(mockPriceData);
        
        // Trigger a mutation to set up a timeout
        if (capturedCallback) {
          const testNode = document.createElement('div');
          const records: MutationRecord[] = [createMockMutationRecord({
            target: rootElement,
            addedNodes: createMockNodeList([testNode])
          })];
          
          // Call the callback to trigger setTimeout
          capturedCallback(records);
          
          // Verify setTimeout was called
          expect(global.setTimeout).toHaveBeenCalled();
          
          // Now stop the observer
          controller.stop();
          
          // Verify the observer was disconnected
          expect(mockDisconnect).toHaveBeenCalledTimes(1);
          
          // Verify clearTimeout was called with the timeout ID
          expect(clearTimeoutMock).toHaveBeenCalledWith(mockTimeoutId);
        }
      } finally {
        // Restore original globals
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
      }
    });
  });
  
  describe('handleMutationsCallback', () => {
    it('should collect added nodes from mutations', () => {
      // This test is more complex because we need to:
      // 1. Access the internal handleMutationsCallback function
      // 2. Create mutation records
      // 3. Monitor if it properly schedules processing
      
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Create spy on setTimeout to track debouncing
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      // Mock the MutationObserver to capture the callback
      let mutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
      
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(function(callback) {
        mutationCallback = callback;
        return {
          observe: mockObserve,
          disconnect: vi.fn()
        };
      });
      
      // Create observer controller with injected mock constructor
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as any
      );
      
      // Start observing
      controller.start(mockPriceData);
      
      // Create mutation records with added nodes
      const addedNode1 = document.createElement('span');
      const addedNode2 = document.createElement('div');
      
      const records: MutationRecord[] = [createMockMutationRecord({
        target: rootElement,
        addedNodes: createMockNodeList([addedNode1, addedNode2])
      })];
      
      // Verify callback was captured
      expect(mutationCallback).not.toBeNull();
      
      // Simulate the callback being called with our records
      if (mutationCallback) {
        mutationCallback(records);
        
        // Check if setTimeout was called (indicating scheduling)
        expect(setTimeoutSpy).toHaveBeenCalled();
        
        // Advance time to trigger the debounced function
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        // Annotation function should have been called for each relevant node
        expect(mockAnnotationFunction).toHaveBeenCalledTimes(2);
      }
    });
    
    it('should ignore mutations with no added nodes', () => {
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Create spy on setTimeout to track debouncing
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      // Mock the MutationObserver to capture the callback
      let mutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
      
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(function(callback) {
        mutationCallback = callback;
        return {
          observe: mockObserve,
          disconnect: vi.fn()
        };
      });
      
      // Create observer controller with injected mock constructor
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as any
      );
      
      // Start observing
      controller.start(mockPriceData);
      
      // Create empty mutation records
      const records: MutationRecord[] = [createMockMutationRecord({
        target: rootElement
      })];
      
      // Verify callback was captured
      expect(mutationCallback).not.toBeNull();
      
      // Simulate the callback being called with our empty records
      if (mutationCallback) {
        mutationCallback(records);
        
        // setTimeout should not be called since there are no nodes to process
        expect(setTimeoutSpy).not.toHaveBeenCalled();
        
        // Advance time
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        // Annotation function should not have been called
        expect(mockAnnotationFunction).not.toHaveBeenCalled();
      }
    });
    
    it('should handle empty mutations array', () => {
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Create spy on setTimeout to track debouncing
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      // Capture the mutation callback
      let mutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
      
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(function(callback) {
        mutationCallback = callback;
        return {
          observe: mockObserve,
          disconnect: vi.fn()
        };
      });
      
      // Create observer controller with injected mock constructor
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as any
      );
      
      // Start observing
      controller.start(mockPriceData);
      
      // Verify callback was captured
      expect(mutationCallback).not.toBeNull();
      
      // Create empty mutations array
      const emptyMutations: MutationRecord[] = [];
      
      if (mutationCallback) {
        // Call with empty mutations array
        mutationCallback(emptyMutations);
        
        // setTimeout should not be called since there are no mutations
        expect(setTimeoutSpy).not.toHaveBeenCalled();
        
        // Annotation function should not have been called
        expect(mockAnnotationFunction).not.toHaveBeenCalled();
      }
    });
    
    it('should handle mutations with only removedNodes but no addedNodes', () => {
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Create spy on setTimeout to track debouncing
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      // Capture the mutation callback
      let mutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
      
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(function(callback) {
        mutationCallback = callback;
        return {
          observe: mockObserve,
          disconnect: vi.fn()
        };
      });
      
      // Create observer controller with injected mock constructor
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as any
      );
      
      // Start observing
      controller.start(mockPriceData);
      
      // Create mutations with only removedNodes
      const removedNode = document.createElement('div');
      const mutationsWithOnlyRemovedNodes: MutationRecord[] = [{
        type: 'childList',
        target: rootElement,
        addedNodes: { length: 0, [Symbol.iterator]: function* () {} } as any,
        removedNodes: { 
          length: 1, 
          0: removedNode,
          [Symbol.iterator]: function* () { yield this[0]; } 
        } as any,
        previousSibling: null,
        nextSibling: null,
        attributeName: null,
        attributeNamespace: null,
        oldValue: null
      }];
      
      if (mutationCallback) {
        // Call with mutations that have only removedNodes
        mutationCallback(mutationsWithOnlyRemovedNodes);
        
        // setTimeout should not be called since there are no added nodes
        expect(setTimeoutSpy).not.toHaveBeenCalled();
        
        // Annotation function should not have been called
        expect(mockAnnotationFunction).not.toHaveBeenCalled();
      }
    });
  });
  
  describe('debouncing mechanism', () => {
    it('should debounce rapid mutations', () => {
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Create spy on setTimeout and clearTimeout
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      // Mock the MutationObserver to capture the callback
      let mutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
      
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(function(callback) {
        mutationCallback = callback;
        return {
          observe: mockObserve,
          disconnect: vi.fn()
        };
      });
      
      // Create observer controller with injected mock constructor
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as any
      );
      
      // Start observing
      controller.start(mockPriceData);
      
      // Verify callback was captured
      expect(mutationCallback).not.toBeNull();
      
      if (mutationCallback) {
        // Simulate multiple mutations in rapid succession
        const createMutationRecord = (node: Node): MutationRecord => ({
          type: 'childList',
          target: rootElement,
          addedNodes: {
            length: 1,
            0: node,
            [Symbol.iterator]: function* () { yield this[0]; }
          } as any,
          removedNodes: { length: 0, [Symbol.iterator]: function* () {} } as any,
          previousSibling: null,
          nextSibling: null,
          attributeName: null,
          attributeNamespace: null,
          oldValue: null
        });
        
        // First mutation
        const node1 = document.createElement('div');
        mutationCallback([createMutationRecord(node1)]);
        
        // Second mutation shortly after
        vi.advanceTimersByTime(100); // Less than debounce time
        const node2 = document.createElement('span');
        mutationCallback([createMutationRecord(node2)]);
        
        // Third mutation shortly after
        vi.advanceTimersByTime(100); // Still less than debounce time
        const node3 = document.createElement('p');
        mutationCallback([createMutationRecord(node3)]);
        
        // setTimeout should have been called 3 times
        expect(setTimeoutSpy).toHaveBeenCalledTimes(3);
        
        // clearTimeout should have been called 2 times (to cancel previous timeouts)
        expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
        
        // Advance time to trigger the debounced function
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        // Annotation function should have been called for all 3 nodes in a single batch
        expect(mockAnnotationFunction).toHaveBeenCalledTimes(3);
      }
    });
  });
  
  describe('node filtering', () => {
    it('should filter out non-Element nodes and script/style elements', () => {
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Mock the MutationObserver to capture the callback
      let mutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
      
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(function(callback) {
        mutationCallback = callback;
        return {
          observe: mockObserve,
          disconnect: vi.fn()
        };
      });
      
      // Create observer controller with injected mock constructor
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as any
      );
      
      // Start observing
      controller.start(mockPriceData);
      
      // Verify callback was captured
      expect(mutationCallback).not.toBeNull();
      
      if (mutationCallback) {
        // Create different types of nodes to test filtering
        const divElement = document.createElement('div');
        const textNode = document.createTextNode('Some text');
        const scriptElement = document.createElement('script');
        const styleElement = document.createElement('style');
        
        // Create mutation with all node types
        const records: MutationRecord[] = [{
          type: 'childList',
          target: rootElement,
          addedNodes: {
            length: 4,
            0: divElement,
            1: textNode,
            2: scriptElement,
            3: styleElement,
            [Symbol.iterator]: function* () {
              yield this[0];
              yield this[1];
              yield this[2];
              yield this[3];
            }
          } as any,
          removedNodes: { length: 0, [Symbol.iterator]: function* () {} } as any,
          previousSibling: null,
          nextSibling: null,
          attributeName: null,
          attributeNamespace: null,
          oldValue: null
        }];
        
        // Trigger the callback
        mutationCallback(records);
        
        // Advance time to trigger the debounced function
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        // Annotation function should only be called for the div element
        // Text nodes, script and style elements should be filtered out
        expect(mockAnnotationFunction).toHaveBeenCalledTimes(1);
        expect(mockAnnotationFunction).toHaveBeenCalledWith(
          divElement,
          mockPriceData,
          processedNodes
        );
      }
    });
  });
  
  describe('error handling', () => {
    it('should handle errors in the annotation function and continue processing', () => {
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Create annotation function that throws for the first node
      const erroringAnnotationFunction = vi.fn((node: Node) => {
        if (node.nodeName === 'DIV') {
          throw new Error('Test error');
        }
      });
      
      // Mock the MutationObserver to capture the callback
      let mutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
      
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(function(callback) {
        mutationCallback = callback;
        return {
          observe: mockObserve,
          disconnect: vi.fn()
        };
      });
      
      // Create observer controller with injected mock constructor
      const controller = createDomObserver(
        rootElement,
        erroringAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as any
      );
      
      // Start observing
      controller.start(mockPriceData);
      
      // Verify callback was captured
      expect(mutationCallback).not.toBeNull();
      
      if (mutationCallback) {
        // Create different nodes
        const divElement = document.createElement('div'); // This will cause an error
        const spanElement = document.createElement('span'); // This should still be processed
        
        // Create mutation with both nodes
        const records: MutationRecord[] = [{
          type: 'childList',
          target: rootElement,
          addedNodes: {
            length: 2,
            0: divElement,
            1: spanElement,
            [Symbol.iterator]: function* () {
              yield this[0];
              yield this[1];
            }
          } as any,
          removedNodes: { length: 0, [Symbol.iterator]: function* () {} } as any,
          previousSibling: null,
          nextSibling: null,
          attributeName: null,
          attributeNamespace: null,
          oldValue: null
        }];
        
        // Trigger the callback
        mutationCallback(records);
        
        // Advance time to trigger the debounced function
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        // Annotation function should have been called for both nodes
        expect(erroringAnnotationFunction).toHaveBeenCalledTimes(2);
        
        // First call should have been with the div (which throws)
        expect(erroringAnnotationFunction).toHaveBeenNthCalledWith(
          1,
          divElement,
          mockPriceData,
          processedNodes
        );
        
        // Second call should have been with the span (which succeeds)
        expect(erroringAnnotationFunction).toHaveBeenNthCalledWith(
          2,
          spanElement,
          mockPriceData,
          processedNodes
        );
        
        // Despite the error, processing should continue and complete
        expect(processedNodes.size).toBe(0); // Since our mock doesn't actually add to the set
      }
    });
    
    it('should handle errors in handleMutationsCallback', () => {
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Mock the mutation callback to capture it
      let mutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
      
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(function(callback) {
        mutationCallback = callback;
        return {
          observe: mockObserve,
          disconnect: vi.fn()
        };
      });
      
      // Create observer controller with injected mock constructor
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as any
      );
      
      // Start observing
      controller.start(mockPriceData);
      
      // Verify callback was captured
      expect(mutationCallback).not.toBeNull();
      
      // Create invalid mutation records that will cause forEach to throw
      const invalidRecords = [createMockMutationRecord({
        target: rootElement,
        addedNodes: null as any, // This will cause an error when trying to access forEach
      })];
      
      if (mutationCallback) {
        // Call should not throw despite the error
        expect(() => mutationCallback(invalidRecords)).not.toThrow();
      }
    });
    
    
    it('should handle observer.observe throwing an error', () => {
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Mock MutationObserver with observe that throws
      const mockObserve = vi.fn(() => {
        throw new Error('Mock observe error');
      });
      const mockMutationObserver = vi.fn(() => ({
        observe: mockObserve,
        disconnect: vi.fn()
      }));
      
      // Create observer controller with injected mock constructor
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as any
      );
      
      // start() should throw because observe throws
      expect(() => controller.stop()).not.toThrow();
      expect(() => controller.start(mockPriceData)).toThrow('Mock observe error');
    });
    
    it('should handle observer.disconnect throwing an error', () => {
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Mock MutationObserver with disconnect that throws
      const mockDisconnect = vi.fn(() => {
        throw new Error('Mock disconnect error');
      });
      const mockMutationObserver = vi.fn(() => ({
        observe: vi.fn(),
        disconnect: mockDisconnect
      }));
      
      // Create observer controller with injected mock constructor
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as any
      );
      
      // Start observing
      controller.start(mockPriceData);
      
      // stop() should not throw even though disconnect throws
      expect(() => controller.stop()).not.toThrow();
    });
  });
  
  describe('processDebouncedNodes', () => {
    it('should handle missing priceData gracefully', () => {
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Capture the mutation callback
      let mutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
      
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(function(callback) {
        mutationCallback = callback;
        return {
          observe: mockObserve,
          disconnect: vi.fn()
        };
      });
      
      // Create observer controller but don't call start() to avoid setting priceData
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as any
      );
      
      // Create a node to process
      const node = document.createElement('div');
      
      // Create mutation records with the node
      const records: MutationRecord[] = [{
        type: 'childList',
        target: rootElement,
        addedNodes: { 
          length: 1, 
          0: node, 
          [Symbol.iterator]: function* () { yield this[0]; } 
        } as any,
        removedNodes: { length: 0, [Symbol.iterator]: function* () {} } as any,
        previousSibling: null,
        nextSibling: null,
        attributeName: null,
        attributeNamespace: null,
        oldValue: null
      }];
      
      if (mutationCallback) {
        // Call the callback - this should add nodes to pendingNodes
        mutationCallback(records);
        
        // Advance time to trigger processDebouncedNodes
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        // Annotation function should not be called due to missing priceData
        expect(mockAnnotationFunction).not.toHaveBeenCalled();
      }
    });
    
    it('should handle empty pendingNodes set gracefully', () => {
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Capture the mutation callback
      let mutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
      
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(function(callback) {
        mutationCallback = callback;
        return {
          observe: mockObserve,
          disconnect: vi.fn()
        };
      });
      
      // Mock performance.now() for test
      const originalPerformanceNow = performance.now;
      performance.now = vi.fn().mockReturnValue(1000);
      
      try {
        // Create controller and start it to set priceData with injected mock constructor
        const controller = createDomObserver(
          rootElement,
          mockAnnotationFunction,
          TEST_DEBOUNCE_MS,
          processedNodes,
          mockMutationObserver as any
        );
        
        controller.start(mockPriceData);
        
        // Create a spy for setTimeout to directly access processDebouncedNodes
        const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
        
        // Add a new node to pendingNodes
        const testNode = document.createElement('div');
        
        // Create a mutation with the new node
        const records: MutationRecord[] = [{
          type: 'childList',
          target: rootElement,
          addedNodes: { 
            length: 1, 
            0: testNode, 
            [Symbol.iterator]: function* () { yield this[0]; } 
          } as any,
          removedNodes: { length: 0, [Symbol.iterator]: function* () {} } as any,
          previousSibling: null,
          nextSibling: null,
          attributeName: null,
          attributeNamespace: null,
          oldValue: null
        }];
        
        if (mutationCallback) {
          // Call the mutation callback to trigger scheduling processDebouncedNodes
          mutationCallback(records);
          
          // Verify setTimeout was called
          expect(setTimeoutSpy).toHaveBeenCalled();
          
          // Get the function that was passed to setTimeout
          const processDebouncedNodesFn = setTimeoutSpy.mock.calls[0][0] as Function;
          
          // Clear pendingNodes by calling processDebouncedNodes once
          processDebouncedNodesFn();
          
          // Annotation function should have been called for the testNode
          expect(mockAnnotationFunction).toHaveBeenCalledWith(testNode, mockPriceData, processedNodes);
          
          // Reset the mock
          mockAnnotationFunction.mockClear();
          
          // Call processDebouncedNodes again - should exit early due to empty pendingNodes
          processDebouncedNodesFn();
          
          // Annotation function should not be called again
          expect(mockAnnotationFunction).not.toHaveBeenCalled();
        }
      } finally {
        // Restore originals
        performance.now = originalPerformanceNow;
      }
    });
  });

  describe('processedNodes sharing', () => {
    it('should share the processedNodes set with the annotation function', () => {
      // Setup
      const rootElement = document.createElement('div');
      const initialProcessedNodes = new Set<Node>([rootElement]); // Pre-populate with root
      
      // Create a special annotation function that adds to the set
      const addingAnnotationFunction = vi.fn((node: Node, _data: PriceData, nodes: Set<Node>) => {
        nodes.add(node);
      });
      
      // Mock the MutationObserver to capture the callback
      let mutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
      
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(function(callback) {
        mutationCallback = callback;
        return {
          observe: mockObserve,
          disconnect: vi.fn()
        };
      });
      
      // Create observer controller with injected mock constructor
      const controller = createDomObserver(
        rootElement,
        addingAnnotationFunction,
        TEST_DEBOUNCE_MS,
        initialProcessedNodes,
        mockMutationObserver as any
      );
      
      // Start observing
      controller.start(mockPriceData);
      
      // Verify callback was captured
      expect(mutationCallback).not.toBeNull();
      
      if (mutationCallback) {
        // Create a node to add
        const newNode = document.createElement('div');
        
        // Create mutation with the new node
        const records: MutationRecord[] = [{
          type: 'childList',
          target: rootElement,
          addedNodes: {
            length: 1,
            0: newNode,
            [Symbol.iterator]: function* () { yield this[0]; }
          } as any,
          removedNodes: { length: 0, [Symbol.iterator]: function* () {} } as any,
          previousSibling: null,
          nextSibling: null,
          attributeName: null,
          attributeNamespace: null,
          oldValue: null
        }];
        
        // Trigger the callback
        mutationCallback(records);
        
        // Advance time to trigger the debounced function
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        // The set should now contain both the root and the new node
        expect(initialProcessedNodes.size).toBe(2);
        expect(initialProcessedNodes.has(rootElement)).toBe(true);
        expect(initialProcessedNodes.has(newNode)).toBe(true);
      }
    });
  });
  
  describe('functionality validation', () => {
    it('should track performance and node counts during processing', () => {
      // Setup
      const rootElement = document.createElement('div');
      const processedNodes = new Set<Node>();
      
      // Create a mock for performance.now that returns two different values
      const originalPerformanceNow = performance.now;
      performance.now = vi
        .fn()
        .mockReturnValueOnce(1000) // First call (start time)
        .mockReturnValueOnce(1500); // Second call (end time, 500ms difference)
      
      // Capture the mutation callback
      let mutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
      
      const mockObserve = vi.fn();
      const mockMutationObserver = vi.fn(function(callback) {
        mutationCallback = callback;
        return {
          observe: mockObserve,
          disconnect: vi.fn()
        };
      });
      
      // Create observer controller with injected mock constructor
      const controller = createDomObserver(
        rootElement,
        mockAnnotationFunction,
        TEST_DEBOUNCE_MS,
        processedNodes,
        mockMutationObserver as any
      );
      
      // Start observing
      controller.start(mockPriceData);
      
      // Create nodes of different types (valid and filtered)
      const divNode = document.createElement('div'); // Valid, should be processed
      const textNode = document.createTextNode('text'); // Invalid, should be filtered
      const scriptNode = document.createElement('script'); // Invalid, should be filtered
      
      // Create mutation records
      const records: MutationRecord[] = [{
        type: 'childList',
        target: rootElement,
        addedNodes: { 
          length: 3, 
          0: divNode,
          1: textNode,
          2: scriptNode,
          [Symbol.iterator]: function* () { 
            yield this[0]; 
            yield this[1];
            yield this[2];
          } 
        } as any,
        removedNodes: { length: 0, [Symbol.iterator]: function* () {} } as any,
        previousSibling: null,
        nextSibling: null,
        attributeName: null,
        attributeNamespace: null,
        oldValue: null
      }];
      
      if (mutationCallback) {
        // Call the callback
        mutationCallback(records);
        
        // Advance time to trigger processDebouncedNodes
        vi.advanceTimersByTime(TEST_DEBOUNCE_MS + 10);
        
        // Verify mockAnnotationFunction was called only for valid nodes
        expect(mockAnnotationFunction).toHaveBeenCalledTimes(1);
        expect(mockAnnotationFunction).toHaveBeenCalledWith(divNode, mockPriceData, processedNodes);
      }
      
      // Restore performance.now
      performance.now = originalPerformanceNow;
    });
  });
});