/**
 * DOM Observer module for detecting and processing DOM changes
 * 
 * This module implements a MutationObserver-based system for watching DOM changes
 * and triggering price annotation on newly added elements. It uses debouncing
 * to handle rapid DOM changes efficiently.
 */

import { PriceData } from '../common/types';
import { createLogger } from '../shared/logger';

/**
 * Logger for the DOM observer module
 */
const logger = createLogger('content-script:dom-observer');

/**
 * Controller interface for DOM mutation observer
 * Provides methods to start and stop observing DOM changes
 */
export interface DomObserverController {
  /**
   * Start observing DOM changes with the given price data
   * @param priceData Current Bitcoin price data
   */
  start(priceData: PriceData): void;
  
  /**
   * Stop observing DOM changes and clean up resources
   */
  stop(): void;
}

/**
 * Creates a controller for observing DOM changes and annotating prices
 * 
 * @param rootElementToObserve Root element to observe for DOM changes (usually document.body)
 * @param annotationFunction Function to call for annotating prices in new DOM nodes
 * @param debounceMilliseconds Milliseconds to debounce rapid DOM changes
 * @param initialProcessedNodes Set of nodes that have already been processed
 * @returns A controller object for starting and stopping the observer
 */
export function createDomObserver(
  rootElementToObserve: HTMLElement,
  annotationFunction: (targetNode: Node, priceData: PriceData, processedNodes: Set<Node>) => void,
  debounceMilliseconds: number,
  initialProcessedNodes: Set<Node>
): DomObserverController {
  // Log creation with debounce value
  logger.info('DOM Observer created.', { debounceMilliseconds });
  
  // Internal state variables
  let currentPriceData: PriceData | null = null;
  let processedNodes: Set<Node> = initialProcessedNodes;
  let observer: MutationObserver | null = null;
  let timeoutId: number | null = null;
  let pendingNodes: Set<Node> = new Set<Node>();
  
  /**
   * Process collected nodes with debouncing
   * Will be fully implemented in T010
   */
  function processDebouncedNodes(): void {
    // This is a placeholder that will be fully implemented in T010
    // We're adding the bare minimum to satisfy TypeScript
    
    logger.debug('Processing debounced nodes.', {
      pendingNodesCount: pendingNodes.size
    });
    
    // Reference the variables to satisfy TypeScript unused variable warnings
    // The actual implementation will be completed in T010
    if (currentPriceData && pendingNodes.size > 0) {
      logger.debug('Would process nodes with:', {
        priceDataAvailable: !!currentPriceData,
        processedNodesSize: processedNodes.size,
        annotationFunctionAvailable: !!annotationFunction
      });
      
      // Actual processing will happen here in T010
    }
    
    // Clear the internal collections after processing
    pendingNodes.clear();
    timeoutId = null;
  }
  
  /**
   * Schedule processing with debouncing to handle rapid DOM changes efficiently
   * @param newNodes New nodes to process
   */
  function scheduleProcessing(newNodes: Node[]): void {
    // Add new nodes to the pending set
    newNodes.forEach(node => pendingNodes.add(node));
    
    // Log the scheduling of processing
    logger.debug('Scheduling debounced processing.', {
      newNodesCount: newNodes.length,
      totalPendingCount: pendingNodes.size,
      debounceMs: debounceMilliseconds
    });
    
    // Clear any existing timeout to implement debouncing
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      logger.debug('Cleared previous debounce timeout.');
    }
    
    // Set a new timeout (cast to number to satisfy TypeScript in browser environment)
    timeoutId = window.setTimeout(processDebouncedNodes, debounceMilliseconds) as unknown as number;
  }
  
  /**
   * Mutation callback function - currently a partial implementation
   * Will be fully implemented in T008
   * @param mutations Array of mutation records from MutationObserver
   */
  function handleMutationsCallback(mutations: MutationRecord[]): void {
    logger.debug('MutationObserver callback triggered.', {
      mutationCount: mutations.length
    });
    
    // This is just a minimal implementation to satisfy TypeScript
    // The full implementation will be done in T008
    // We're creating an empty array as a placeholder until T008 is implemented
    const dummyNodes: Node[] = [];
    
    // Schedule processing of the nodes (will be populated in T008)
    scheduleProcessing(dummyNodes);
  }
  
  return {
    start(priceData: PriceData): void {
      // Store the price data for future use
      currentPriceData = priceData;
      
      // Create the MutationObserver with the callback
      observer = new MutationObserver(handleMutationsCallback);
      
      // Start observing with specified configuration
      observer.observe(rootElementToObserve, {
        childList: true, // Watch for added/removed children
        subtree: true    // Watch the entire subtree
      });
      
      // Log the observer start
      logger.info('DOM Observer started on element:', {
        rootElementNodeName: rootElementToObserve.nodeName
      });
    },
    
    stop(): void {
      // Disconnect the MutationObserver if it exists
      if (observer !== null) {
        observer.disconnect();
        logger.debug('MutationObserver disconnected.');
        observer = null;
      }
      
      // Clear any pending debounce timeout
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
        logger.debug('Cleared debounce timeout during stop.');
      }
      
      // Log that the observer has been fully stopped
      logger.info('DOM Observer stopped.');
    }
  };
}