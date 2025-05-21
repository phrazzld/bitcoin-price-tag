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
  
  /**
   * Placeholder for the mutation callback function
   * Will be fully implemented in T008
   * @param mutations Array of mutation records from MutationObserver
   */
  function handleMutationsCallback(mutations: MutationRecord[]): void {
    // This will be implemented in T008
    logger.debug('MutationObserver callback triggered.', {
      mutationCount: mutations.length
    });
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
      // Will be implemented in T007
      logger.info('DOM Observer stopped.');
    }
  };
}