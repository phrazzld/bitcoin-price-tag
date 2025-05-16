/**
 * Content script entry point for the Bitcoin Price Tag extension
 * This script runs on web pages and initiates price annotation
 */

/**
 * Main function that will be called when the page is ready
 * This will be expanded in T024 to wire up messaging and DOM modules
 */
async function initPriceAnnotation(): Promise<void> {
  console.log('Bitcoin Price Tag: Initializing price annotation');
  
  try {
    // TODO: In T024, this will:
    // 1. Request price data using the messaging module
    // 2. Annotate prices using the DOM module
    // For now, just log that we're ready
    console.log('Bitcoin Price Tag: Ready to request price data');
  } catch (error) {
    console.error('Bitcoin Price Tag: Failed to initialize', error);
  }
}

/**
 * Initialize when DOM is ready
 */
function initialize(): void {
  if (document.readyState === 'loading') {
    // If DOM is still loading, wait for it to complete
    document.addEventListener('DOMContentLoaded', () => {
      console.log('Bitcoin Price Tag: DOM content loaded');
      initPriceAnnotation();
    });
  } else {
    // DOM is already loaded
    console.log('Bitcoin Price Tag: DOM already loaded');
    initPriceAnnotation();
  }
}

// Start initialization
console.log('Bitcoin Price Tag: Content script loaded');
initialize();