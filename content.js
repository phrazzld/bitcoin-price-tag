// Import conversion functions
import {
  buildPrecedingMatchPattern,
  buildConcludingMatchPattern,
  extractNumericValue,
  getMultiplier,
  valueInSats,
  valueInBtc,
  makeSnippet,
  calculateSatPrice
} from './conversion.js';

// Import browser detection utility
import { detectBrowser, checkFeatureSupport, getBrowserAdaptations, applyPolyfills } from './browser-detect.js';

// Global price variables
let btcPrice;
let satPrice;

// Apply browser-specific adaptations
const browserInfo = detectBrowser();
const featureSupport = checkFeatureSupport();
const adaptations = getBrowserAdaptations();

// Apply polyfills if necessary
if (!featureSupport.isSupported) {
  applyPolyfills();
}

// Convert prices in a text node
const convert = (textNode) => {
  let sourceMoney;
  // Currency indicator preceding amount
  let matchPattern = buildPrecedingMatchPattern();
  textNode.nodeValue = textNode.nodeValue.replace(matchPattern, function (e) {
    let multiplier = getMultiplier(e);
    sourceMoney = extractNumericValue(e).toFixed(2);
    return makeSnippet(e, sourceMoney * multiplier, btcPrice, satPrice);
  });
  // Currency indicator concluding amount
  matchPattern = buildConcludingMatchPattern();
  textNode.nodeValue = textNode.nodeValue.replace(matchPattern, function (e) {
    let multiplier = getMultiplier(e);
    sourceMoney = extractNumericValue(e).toFixed(2);
    return makeSnippet(e, sourceMoney * multiplier, btcPrice, satPrice);
  });
};

// Credit to t-j-crowder on StackOverflow for this walk function
// http://bit.ly/1o47R7V
// Enhanced with browser compatibility features
const walk = (node) => {
  let child, next, price;

  // For safety, check if node exists
  if (!node) return;

  // Use appropriate text property based on browser detection
  const textProperty = adaptations.textPropertyToUse;

  switch (node.nodeType) {
    case 1: // Element
    case 9: // Document
    case 11: // Document fragment
      // Skip certain elements that should not be processed
      const tagName = node.tagName && node.tagName.toLowerCase();
      if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
        return;
      }

      child = node.firstChild;
      while (child) {
        next = child.nextSibling;

        try {
          // Check if child is Amazon display price
          const classes = child.classList;
          if (
            classes &&
            ["sx-price-currency", "a-price-symbol"].includes(classes.value) &&
            child.firstChild
          ) {
            price = child.firstChild.nodeValue?.toString() || '';
            child.firstChild.nodeValue = null;
          } else if (
            classes &&
            ["sx-price-whole", "a-price-whole", "a-price-decimal"].includes(
              classes.value
            ) &&
            child.firstChild &&
            next?.firstChild
          ) {
            price = (price || '') +
              (child.firstChild.nodeValue || '').toString() +
              "." +
              (next.firstChild.nodeValue || '').toString();
            child.firstChild.nodeValue = price;
            convert(child.firstChild);
            child = next;
          } else if (
            classes &&
            ["sx-price-fractional", "a-price-fraction"].includes(classes.value) &&
            child.firstChild
          ) {
            if (child.firstChild) {
              child.firstChild.nodeValue = null;
            }
            price = null;
          }
        } catch (e) {
          console.error('Error processing element:', e);
        }

        walk(child);
        child = next;
      }
      break;
    case 3: // Text node
      // Only process non-empty text nodes
      if (node.nodeValue && node.nodeValue.trim() !== '') {
        convert(node);
      }
      break;
  }
};

// Function to request Bitcoin price from the service worker
// Enhanced with browser compatibility handling
const getBitcoinPrice = () => {
  return new Promise((resolve, reject) => {
    // Check if we have chrome API access
    if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
      console.error('Chrome runtime API not available');
      // Fallback to default values if in testing environment
      if (typeof window !== 'undefined' && window.TESTING_MODE) {
        resolve({
          btcPrice: 50000,
          satPrice: 0.0005,
          timestamp: Date.now()
        });
        return;
      }
      reject(new Error('Chrome runtime API not available'));
      return;
    }
    
    // Send message with timeout for better browser compatibility
    const timeoutId = setTimeout(() => {
      reject(new Error('Request for Bitcoin price timed out'));
    }, 5000);
    
    try {
      chrome.runtime.sendMessage({ action: 'getBitcoinPrice' }, (response) => {
        clearTimeout(timeoutId);
        
        if (chrome.runtime.lastError) {
          console.error('Error getting Bitcoin price:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else if (!response) {
          console.error('No price data available');
          reject(new Error('No price data available'));
        } else {
          resolve(response);
        }
      });
    } catch (e) {
      clearTimeout(timeoutId);
      console.error('Exception sending message:', e);
      reject(e);
    }
  });
};

// Process the page with Bitcoin price data
const processPage = (priceData) => {
  // Save BTC and sat prices to globals
  btcPrice = priceData.btcPrice;
  satPrice = priceData.satPrice || calculateSatPrice(btcPrice);
  
  // Read the page and annotate prices with their equivalent bitcoin values
  walk(document.body);
};

// Initialize the extension by getting price and processing the page
// Enhanced with browser compatibility features
const init = async () => {
  try {
    // Check if the browser is supported before proceeding
    if (!featureSupport.isSupported) {
      console.warn('Bitcoin Price Tag: Browser may not fully support all required features');
      // Apply polyfills again just to be safe
      applyPolyfills();
    }
    
    // Log browser information for debugging
    console.debug('Bitcoin Price Tag running on:', browserInfo.name, browserInfo.version);
    
    // Request Bitcoin price from service worker
    const priceData = await getBitcoinPrice();
    processPage(priceData);
    
    // Set up MutationObserver for dynamic content if supported
    if (featureSupport.mutationObserver) {
      setupMutationObserver();
    }
  } catch (error) {
    console.error('Bitcoin Price Tag: Failed to get price data', error);
  }
};

// Set up MutationObserver to handle dynamically added content
function setupMutationObserver() {
  // Use browser-specific adaptation settings
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Process newly added nodes
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          // Only process element nodes
          if (node.nodeType === 1) {
            walk(node);
          }
        }
      }
    }
  });
  
  // Start observing with browser-specific configuration
  observer.observe(document.body, adaptations.observerConfig);
}

// Function to determine optimal delay based on browser and page complexity
function getOptimalDelay() {
  // Default delay
  let delay = 2500;
  
  // Adjust based on browser
  if (browserInfo.isFirefox) {
    delay = 3000; // Firefox might need a bit more time
  } else if (browserInfo.isSafari) {
    delay = 3000; // Safari also needs more time
  }
  
  // Adjust based on page complexity
  const pageComplexity = document.querySelectorAll('*').length;
  if (pageComplexity > 5000) {
    delay += 1000; // Add more delay for complex pages
  }
  
  return delay;
}

// Run initialization after a short delay to ensure page is fully loaded
// Use browser-specific optimal delay
setTimeout(init, getOptimalDelay());
