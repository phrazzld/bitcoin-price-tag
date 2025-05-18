/**
 * Content script entry point for the Bitcoin Price Tag extension
 * This script runs on web pages and initiates price annotation
 */

import { requestPriceData } from './messaging';
import { findAndAnnotatePrices } from './dom';
import { createLogger } from '../shared/logger';

/** Logger instance for this module */
const logger = createLogger('content-script');

/** Delay before initial price request (in milliseconds) */
const INITIAL_REQUEST_DELAY = 2500;

/**
 * Main function that will be called when the page is ready
 * Requests price data and annotates the DOM
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

    // Annotate prices in the DOM
    logger.info('Annotating prices in DOM', {
      function_name: 'initPriceAnnotation'
    });
    findAndAnnotatePrices(document.body, priceData);
    logger.info('Price annotation completed', {
      function_name: 'initPriceAnnotation'
    });
  } catch (error) {
    // Handle specific error types
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
  }
}

/**
 * Initialize when DOM is ready
 */
function initialize(): void {
  const runWithDelay = () => {
    // Add delay before initial request, matching original behavior
    setTimeout(() => {
      initPriceAnnotation();
    }, INITIAL_REQUEST_DELAY);
  };

  if (document.readyState === 'loading') {
    // If DOM is still loading, wait for it to complete
    document.addEventListener('DOMContentLoaded', () => {
      logger.info('DOM content loaded', {
        function_name: 'initialize'
      });
      runWithDelay();
    });
  } else {
    // DOM is already loaded
    logger.info('DOM already loaded', {
      function_name: 'initialize',
      readyState: document.readyState
    });
    runWithDelay();
  }
}

// Start initialization
logger.info('Content script loaded', {
  url: window.location.href
});
initialize();