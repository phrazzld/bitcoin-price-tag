/**
 * Content script entry point for the Bitcoin Price Tag extension
 * This script runs on web pages and initiates price annotation
 */

import { requestPriceData } from './messaging';
import { findAndAnnotatePrices } from './dom';
import { createLogger } from '../shared/logger';
import { createDomObserver } from './dom-observer';
import { DOM_OBSERVER_DEBOUNCE_MS } from '../common/constants';

/** Logger instance for this module */
const logger = createLogger('content-script');

/**
 * Main function that will be called when the page is ready
 * Requests price data, creates a processedNodes set to track annotated nodes,
 * and initiates the price annotation process
 */
async function initPriceAnnotation(): Promise<void> {
  logger.info('Initializing price annotation', {
    url: window.location.href,
    function_name: 'initPriceAnnotation'
  });

  try {
    // Request price data from the service worker
    logger.info('Requesting price data', {
      function_name: 'initPriceAnnotation'
    });
    const priceData = await requestPriceData();
    logger.info('Price data received', {
      function_name: 'initPriceAnnotation',
      rate: priceData.usdRate,
      fetchedAt: priceData.fetchedAt
    });

    // Create a set to track processed nodes and avoid redundant work
    const processedNodes = new Set<Node>();
    logger.info('Created processedNodes set for tracking annotated nodes', {
      function_name: 'initPriceAnnotation'
    });

    // Annotate prices in the DOM
    logger.info('Annotating prices in DOM', {
      function_name: 'initPriceAnnotation'
    });
    findAndAnnotatePrices(document.body, priceData, processedNodes);
    logger.info('Price annotation completed', {
      function_name: 'initPriceAnnotation',
      processedNodesCount: processedNodes.size
    });
    
    // Create and start DOM observer to handle dynamically loaded content
    logger.info('Creating DOM observer for dynamic content', {
      function_name: 'initPriceAnnotation'
    });
    const domObserver = createDomObserver(
      document.body,
      findAndAnnotatePrices,
      DOM_OBSERVER_DEBOUNCE_MS,
      processedNodes
    );
    
    // Start observing DOM changes with the current price data
    domObserver.start(priceData);
    logger.info('DOM observer started', {
      function_name: 'initPriceAnnotation',
      debounceMs: DOM_OBSERVER_DEBOUNCE_MS
    });
  } catch (error) {
    // Silent failure approach: Log errors without showing visual indicators to users
    // This ensures a non-intrusive browsing experience even when price data is unavailable
    // See docs/ERROR_HANDLING.md for the rationale behind this design decision
    
    if (error instanceof Error) {
      if (error.name === 'PriceRequestTimeoutError') {
        logger.error('Request timed out', error, {
          function_name: 'initPriceAnnotation'
        });
      } else if (error.name === 'PriceRequestError') {
        logger.error('Request failed', error, {
          function_name: 'initPriceAnnotation'
        });
      } else {
        logger.error('Unexpected error', error, {
          function_name: 'initPriceAnnotation'
        });
      }
    } else {
      logger.error('Unknown error', new Error(String(error)), {
        function_name: 'initPriceAnnotation',
        context: { error }
      });
    }
    
    // Continue normal operation - page displays without price annotations
  }
}

/**
 * Initialize when DOM is ready
 * This function ensures price annotation only happens after the DOM is available
 */
function initialize(): void {
  if (document.readyState === 'loading') {
    // If DOM is still loading, wait for it to complete
    document.addEventListener('DOMContentLoaded', () => {
      logger.info('DOM content loaded', {
        function_name: 'initialize'
      });
      // Start annotation directly when DOM is ready
      initPriceAnnotation();
    });
  } else {
    // DOM is already loaded
    logger.info('DOM already loaded', {
      function_name: 'initialize',
      readyState: document.readyState
    });
    // Start annotation immediately as DOM is already available
    initPriceAnnotation();
  }
}

// Start initialization
logger.info('Content script loaded', {
  url: window.location.href
});
initialize();