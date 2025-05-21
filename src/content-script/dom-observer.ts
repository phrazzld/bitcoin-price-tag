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
   * Process collected nodes from DOM mutations
   * 
   * This function processes all the nodes that have been collected from 
   * MutationObserver notifications. It's called after the debounce period
   * to efficiently handle rapid DOM changes.
   */
  function processDebouncedNodes(): void {
    // Log the start of processing with node count
    logger.debug('Processing debounced nodes.', {
      pendingNodesCount: pendingNodes.size
    });
    
    // Safety check: we need price data to annotate prices
    if (!currentPriceData) {
      logger.warn('Cannot process nodes: No price data available.');
      pendingNodes.clear();
      timeoutId = null;
      return;
    }
    
    // Exit early if there are no nodes to process
    if (pendingNodes.size === 0) {
      logger.debug('No nodes to process.');
      timeoutId = null;
      return;
    }
    
    try {
      // Track start time for performance logging
      const startTime = performance.now();
      
      // Convert set to array for iteration
      const nodesToProcess = Array.from(pendingNodes);
      
      // Process each node using the annotation function
      for (const node of nodesToProcess) {
        try {
          // Call the annotation function with the node, priceData, and shared processedNodes set
          annotationFunction(node, currentPriceData, processedNodes);
        } catch (error) {
          // Log errors for individual nodes but continue processing others
          logger.error('Error processing individual node:', {
            nodeName: node.nodeName,
            nodeType: node.nodeType,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Calculate processing duration for performance monitoring
      const duration = performance.now() - startTime;
      
      // Log completion with performance metrics
      logger.debug('Finished processing debounced nodes.', {
        nodesProcessed: nodesToProcess.length,
        durationMs: Math.round(duration),
        processedNodesSize: processedNodes.size
      });
    } catch (error) {
      // Log any unexpected errors during processing
      logger.error('Error in processDebouncedNodes:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      // Always clear the pendingNodes set and reset timeoutId
      // regardless of success or failure
      pendingNodes.clear();
      timeoutId = null;
    }
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
   * Mutation callback function that extracts added nodes from mutations
   * and schedules them for processing with debouncing
   * @param mutations Array of mutation records from MutationObserver
   */
  function handleMutationsCallback(mutations: MutationRecord[]): void {
    // Log the callback trigger with mutation count
    logger.debug('MutationObserver callback triggered.', {
      mutationCount: mutations.length
    });
    
    // Exit early if there are no mutations
    if (mutations.length === 0) {
      logger.debug('No mutations to process.');
      return;
    }
    
    // Collect all added nodes from all mutations
    const addedNodes: Node[] = [];
    
    for (const mutation of mutations) {
      // Check if this mutation has added nodes
      if (mutation.addedNodes.length > 0) {
        // Convert NodeList to array and add to our collection
        const nodes = Array.from(mutation.addedNodes);
        nodes.forEach(node => addedNodes.push(node));
      }
    }
    
    // Log the number of added nodes found
    logger.debug('Collected added nodes from mutations.', {
      addedNodesCount: addedNodes.length
    });
    
    // Exit early if no added nodes were found
    if (addedNodes.length === 0) {
      logger.debug('No added nodes to process.');
      return;
    }
    
    // Schedule the collected nodes for processing
    // This uses the debouncing mechanism implemented in T009
    scheduleProcessing(addedNodes);
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