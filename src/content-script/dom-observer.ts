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
 * @param mutationObserverConstructor Constructor for MutationObserver (defaults to global MutationObserver)
 * @returns A controller object for starting and stopping the observer
 */
export function createDomObserver(
  rootElementToObserve: HTMLElement,
  annotationFunction: (targetNode: Node, priceData: PriceData, processedNodes: Set<Node>) => void,
  debounceMilliseconds: number,
  initialProcessedNodes: Set<Node>,
  mutationObserverConstructor: typeof MutationObserver = MutationObserver
): DomObserverController {
  logger.info('DOM Observer created.', { debounceMilliseconds });
  
  let currentPriceData: PriceData | null = null;
  let processedNodes: Set<Node> = initialProcessedNodes;
  let observer: MutationObserver | null = null;
  let timeoutId: number | null = null;
  let pendingNodes: Set<Node> = new Set<Node>();
  
  /**
   * Determines if a node should be processed for price annotation
   * 
   * @param node The DOM node to check
   * @returns true if the node should be processed, false otherwise
   */
  function shouldProcessNode(node: Node): boolean {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    
    // Skip script and style elements (they never contain visible prices)
    const nodeName = node.nodeName.toUpperCase();
    if (nodeName === 'SCRIPT' || nodeName === 'STYLE') {
      return false;
    }
    
    return true;
  }
  
  /**
   * Process collected nodes from DOM mutations
   * 
   * This function processes all the nodes that have been collected from 
   * MutationObserver notifications. It's called after the debounce period
   * to efficiently handle rapid DOM changes. It filters out irrelevant nodes
   * before passing them to the annotation function.
   */
  function processDebouncedNodes(): void {
    logger.debug('Processing debounced node batch.', {
      nodeCount: pendingNodes.size
    });
    
    if (!currentPriceData) {
      logger.warn('Cannot process nodes: No price data available.');
      pendingNodes.clear();
      timeoutId = null;
      return;
    }
    
    if (pendingNodes.size === 0) {
      logger.debug('No nodes to process.');
      timeoutId = null;
      return;
    }
    
    try {
      const startTime = performance.now();
      const nodesToProcess = Array.from(pendingNodes);
      let processedCount = 0;
      let filteredCount = 0;
      
      for (const node of nodesToProcess) {
        try {
          if (!shouldProcessNode(node)) {
            filteredCount++;
            logger.debug('Node filtered out (irrelevant type):', {
              nodeName: node.nodeName,
              nodeType: node.nodeType
            });
            continue;
          }
          
          annotationFunction(node, currentPriceData, processedNodes);
          processedCount++;
        } catch (error) {
          logger.error('Error processing individual node:', {
            nodeName: node.nodeName,
            nodeType: node.nodeType,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      const duration = performance.now() - startTime;
      
      logger.debug('Finished processing debounced node batch.', {
        nodeCount: nodesToProcess.length,
        processedCount,
        filteredCount,
        durationMs: Math.round(duration),
        processedNodesSize: processedNodes.size
      });
    } catch (error) {
      logger.error('Error in processDebouncedNodes:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      // Always clear state regardless of success or failure
      pendingNodes.clear();
      timeoutId = null;
    }
  }
  
  /**
   * Schedule processing with debouncing to handle rapid DOM changes efficiently
   * @param newNodes New nodes to process
   */
  function scheduleProcessing(newNodes: Node[]): void {
    try {
      newNodes.forEach(node => pendingNodes.add(node));
    
      logger.debug('Scheduling debounced processing.', {
        newNodesCount: newNodes.length,
        totalPendingCount: pendingNodes.size,
        debounceMs: debounceMilliseconds
      });
    
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        logger.debug('Cleared previous debounce timeout.');
      }
    
      // window.setTimeout returns number in browser environment
      timeoutId = window.setTimeout(processDebouncedNodes, debounceMilliseconds) as number;
    } catch (error) {
      logger.error('Error scheduling debounced processing.', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
    }
  }
  
  /**
   * Mutation callback function that extracts added nodes from mutations
   * and schedules them for processing with debouncing
   * @param mutations Array of mutation records from MutationObserver
   */
  function handleMutationsCallback(mutations: MutationRecord[]): void {
    try {
      logger.debug('MutationObserver callback triggered.', {
        mutationCount: mutations.length
      });
    
      if (mutations.length === 0) {
        logger.debug('No mutations to process.');
        return;
      }
    
      const addedNodes: Node[] = [];
    
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          const nodes = Array.from(mutation.addedNodes);
          nodes.forEach(node => addedNodes.push(node));
        }
      }
    
      logger.debug('Collected added nodes for debounced processing.', {
        addedNodeCount: addedNodes.length
      });
    
      if (addedNodes.length === 0) {
        logger.debug('No added nodes to process.');
        return;
      }
    
      scheduleProcessing(addedNodes);
    } catch (error) {
      logger.error('Error in MutationObserver callback.', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
    }
  }
  
  return {
    start(priceData: PriceData): void {
      try {
        currentPriceData = priceData;
      
        observer = new mutationObserverConstructor(handleMutationsCallback);
      
        observer.observe(rootElementToObserve, {
          childList: true, // Watch for added/removed children
          subtree: true    // Watch the entire subtree
        });
      
        logger.info('DOM Observer started on element:', {
          rootElementNodeName: rootElementToObserve.nodeName
        });
      } catch (error) {
        logger.error('Error starting DOM Observer.', {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined
        });
        throw error; // Re-throw to notify caller of the failure
      }
    },
    
    stop(): void {
      try {
        if (observer !== null) {
          observer.disconnect();
          logger.debug('MutationObserver disconnected.');
          observer = null;
        }
      
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
          logger.debug('Cleared debounce timeout during stop.');
        }
      
        logger.info('DOM Observer stopped.');
      } catch (error) {
        logger.error('Error stopping DOM Observer.', {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined
        });
      }
    }
  };
}