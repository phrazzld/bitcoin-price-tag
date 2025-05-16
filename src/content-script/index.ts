/**
 * Content script entry point for the Bitcoin Price Tag extension
 * This script runs on web pages and initiates price annotation
 */

import { requestPriceData } from './messaging';
import { findAndAnnotatePrices } from './dom';

/** Delay before initial price request (in milliseconds) */
const INITIAL_REQUEST_DELAY = 2500;

/**
 * Main function that will be called when the page is ready
 * Requests price data and annotates the DOM
 */
async function initPriceAnnotation(): Promise<void> {
  console.log('Bitcoin Price Tag: Initializing price annotation');

  try {
    // Request price data from the service worker
    console.log('Bitcoin Price Tag: Requesting price data...');
    const priceData = await requestPriceData();
    console.log('Bitcoin Price Tag: Price data received', priceData);

    // Annotate prices in the DOM
    console.log('Bitcoin Price Tag: Annotating prices in DOM...');
    findAndAnnotatePrices(document.body, priceData);
    console.log('Bitcoin Price Tag: Price annotation completed');
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'PriceRequestTimeoutError') {
        console.error('Bitcoin Price Tag: Request timed out', error.message);
      } else if (error.name === 'PriceRequestError') {
        console.error('Bitcoin Price Tag: Request failed', error.message);
      } else {
        console.error('Bitcoin Price Tag: Unexpected error', error);
      }
    } else {
      console.error('Bitcoin Price Tag: Unknown error', error);
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
      console.log('Bitcoin Price Tag: DOM content loaded');
      runWithDelay();
    });
  } else {
    // DOM is already loaded
    console.log('Bitcoin Price Tag: DOM already loaded');
    runWithDelay();
  }
}

// Start initialization
console.log('Bitcoin Price Tag: Content script loaded');
initialize();