/**
 * DOM Scanning Algorithm
 * 
 * Optimized functions for scanning the DOM and converting currency values
 */

import {
  buildPrecedingMatchPattern,
  buildConcludingMatchPattern,
  extractNumericValue,
  getMultiplier,
  makeSnippet
} from './conversion.js';

// Cache for processed nodes to avoid re-processing
const processedNodes = new WeakSet();

// Elements that are unlikely to contain price text
const SKIP_TAGS = new Set([
  'script', 'style', 'noscript', 'svg', 'canvas', 'video', 'audio', 
  'img', 'iframe', 'meta', 'link', 'head', 'template', 'input', 'textarea'
]);

// Common price-related class names and identifiers
const PRICE_SELECTORS = [
  '.price', '.cost', '.amount', '.fee', '.total', '*[class*="price"]', 
  '*[class*="cost"]', '*[class*="amount"]', '*[id*="price"]', '*[id*="cost"]',
  '*[class*="currency"]', '*[class*="usd"]', '*[class*="total"]',
  '*[class*="dollars"]', '.a-price', '.sx-price', '*[class*="product"]',
  '*[id*="product-price"]', 'span.money'
];

// Cache for regular expressions to avoid rebuilding them
let precedingMatchPatternCache = null;
let concludingMatchPatternCache = null;

/**
 * Get cached or build new currency pattern
 * @returns {RegExp} The preceding match pattern
 */
function getPrecedingMatchPattern() {
  if (!precedingMatchPatternCache) {
    precedingMatchPatternCache = buildPrecedingMatchPattern();
  }
  return precedingMatchPatternCache;
}

/**
 * Get cached or build new currency pattern
 * @returns {RegExp} The concluding match pattern
 */
function getConcludingMatchPattern() {
  if (!concludingMatchPatternCache) {
    concludingMatchPatternCache = buildConcludingMatchPattern();
  }
  return concludingMatchPatternCache;
}

/**
 * Convert price text in a node
 * @param {Node} textNode - Text node to process
 * @param {number} btcPrice - Bitcoin price
 * @param {number} satPrice - Satoshi price
 * @returns {boolean} Whether any conversions were made
 */
export function convertPriceText(textNode, btcPrice, satPrice) {
  if (!textNode || !textNode.nodeValue || textNode.nodeValue.trim() === '') {
    return false;
  }
  
  let nodeValue = textNode.nodeValue;
  let converted = false;
  
  // Check for currency indicators
  if (nodeValue.includes('$') || nodeValue.includes('USD')) {
    // Currency indicator preceding amount
    const precedingPattern = getPrecedingMatchPattern();
    const newValue = nodeValue.replace(precedingPattern, function(match) {
      converted = true;
      const multiplier = getMultiplier(match);
      const sourceMoney = extractNumericValue(match).toFixed(2);
      return makeSnippet(match, sourceMoney * multiplier, btcPrice, satPrice);
    });
    
    if (newValue !== nodeValue) {
      nodeValue = newValue;
    }
    
    // Currency indicator concluding amount
    const concludingPattern = getConcludingMatchPattern();
    const finalValue = nodeValue.replace(concludingPattern, function(match) {
      converted = true;
      const multiplier = getMultiplier(match);
      const sourceMoney = extractNumericValue(match).toFixed(2);
      return makeSnippet(match, sourceMoney * multiplier, btcPrice, satPrice);
    });
    
    if (finalValue !== nodeValue) {
      nodeValue = finalValue;
      converted = true;
    }
    
    if (converted) {
      textNode.nodeValue = nodeValue;
    }
  }
  
  return converted;
}

/**
 * Process Amazon-style price components
 * @param {Element} node - DOM element that might be a price component
 * @param {number} btcPrice - Bitcoin price
 * @param {number} satPrice - Satoshi price
 * @returns {Object} Processing result including next node
 */
export function processAmazonPrice(node, next, btcPrice, satPrice) {
  let price = '';
  let nextNode = next;
  let processed = false;
  
  try {
    const classes = node.classList;
    if (!classes) return { processed, nextNode };
    
    if (["sx-price-currency", "a-price-symbol"].some(c => classes.contains(c)) && 
        node.firstChild) {
      // Price symbol node
      price = node.firstChild.nodeValue?.toString() || '';
      node.firstChild.nodeValue = null;
      processed = true;
    } 
    else if (["sx-price-whole", "a-price-whole", "a-price-decimal"].some(c => classes.contains(c)) && 
        node.firstChild && next?.firstChild) {
      // Price whole part with decimal point
      price = (price || '') +
        (node.firstChild.nodeValue || '').toString() +
        "." +
        (next.firstChild.nodeValue || '').toString();
      
      // Convert the combined price
      if (node.firstChild) {
        node.firstChild.nodeValue = price;
        convertPriceText(node.firstChild, btcPrice, satPrice);
        nextNode = next;
        processed = true;
      }
    } 
    else if (["sx-price-fractional", "a-price-fraction"].some(c => classes.contains(c)) && 
        node.firstChild) {
      // Price fraction part - clear it as it's been processed with the whole part
      if (node.firstChild) {
        node.firstChild.nodeValue = null;
      }
      price = null;
      processed = true;
    }
  } catch (e) {
    console.error('Error processing Amazon price element:', e);
  }
  
  return { 
    processed, 
    nextNode, 
    price 
  };
}

/**
 * Check if node is visible
 * @param {Element} node - DOM element to check
 * @returns {boolean} Whether the node is visible
 */
export function isNodeVisible(node) {
  if (!node || node.nodeType !== 1) return true; // Text nodes are considered visible
  
  try {
    const style = window.getComputedStyle(node);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           node.offsetParent !== null;
  } catch (e) {
    return true; // If we can't determine visibility, assume it's visible
  }
}

/**
 * Check if element is price-related based on class names and id
 * @param {Element} element - DOM element to check
 * @returns {boolean} Whether the element is price-related
 */
export function isPriceRelated(element) {
  if (!element || element.nodeType !== 1) return false;
  
  try {
    // Check the element's class list
    if (element.classList) {
      const classStr = Array.from(element.classList).join(' ').toLowerCase();
      if (classStr.includes('price') || 
          classStr.includes('cost') || 
          classStr.includes('amount') || 
          classStr.includes('currency') ||
          classStr.includes('usd') ||
          classStr.includes('dollars') ||
          classStr.includes('total') ||
          classStr.includes('subtotal')) {
        return true;
      }
    }
    
    // Check the element's id
    if (element.id) {
      const id = element.id.toLowerCase();
      if (id.includes('price') || 
          id.includes('cost') || 
          id.includes('amount') ||
          id.includes('total')) {
        return true;
      }
    }
    
    // Check for Amazon price components
    if (element.classList && (
        element.classList.contains('a-price') ||
        element.classList.contains('sx-price') ||
        element.classList.contains('a-price-whole') ||
        element.classList.contains('a-price-fraction') ||
        element.classList.contains('a-price-symbol'))) {
      return true;
    }
    
    // Check inner text for currency symbols
    if (element.innerText && 
        (element.innerText.includes('$') || 
         element.innerText.includes('USD') ||
         /\d+\.\d{2}/.test(element.innerText))) {
      return true;
    }
  } catch (e) {
    console.error('Error checking if element is price-related:', e);
  }
  
  return false;
}

/**
 * Find price-related elements in the DOM
 * @param {Document|Element} root - Root element to search in
 * @returns {Element[]} Array of price-related elements
 */
export function findPriceElements(root) {
  if (!root) return [];
  
  try {
    // Combine all selectors for a single query
    return Array.from(root.querySelectorAll(PRICE_SELECTORS.join(',')));
  } catch (e) {
    console.error('Error finding price elements:', e);
    return [];
  }
}

/**
 * Walk the DOM tree non-recursively
 * @param {Element} startNode - The node to start walking from
 * @param {number} btcPrice - Bitcoin price
 * @param {number} satPrice - Satoshi price
 * @param {boolean} isTargeted - Whether this is a targeted scan of price elements
 */
export function walkDomTree(startNode, btcPrice, satPrice, isTargeted = false) {
  if (!startNode) return;
  
  // Skip if we've already processed this node
  if (processedNodes.has(startNode)) return;
  
  // Use a stack instead of recursion to avoid call stack issues with large DOM trees
  const stack = [startNode];
  
  while (stack.length > 0) {
    const node = stack.pop();
    
    // Skip null nodes
    if (!node) continue;
    
    // Skip already processed nodes
    if (processedNodes.has(node)) continue;
    
    // Mark node as processed
    processedNodes.add(node);
    
    // Process based on node type
    switch (node.nodeType) {
      case 1: // Element
      case 9: // Document
      case 11: // Document fragment
        // Skip elements that are unlikely to contain prices
        const tagName = node.tagName && node.tagName.toLowerCase();
        if (SKIP_TAGS.has(tagName)) continue;
        
        // Skip invisible elements in targeted mode only (for completeness in full scan)
        if (isTargeted && !isNodeVisible(node)) continue;
        
        // Skip elements without price-related classes in targeted mode
        if (isTargeted && !isPriceRelated(node)) continue;
        
        // Process children in reverse order for stack
        let child = node.lastChild;
        while (child) {
          const prev = child.previousSibling;
          
          // Check for Amazon price component format
          if (child.nodeType === 1 && child.classList) {
            const { processed, nextNode } = processAmazonPrice(child, child.nextSibling, btcPrice, satPrice);
            if (processed) {
              // Skip the next node if it was processed as part of this one
              child = prev;
              continue;
            }
          }
          
          stack.push(child);
          child = prev;
        }
        break;
        
      case 3: // Text node
        // Only process non-empty text nodes
        convertPriceText(node, btcPrice, satPrice);
        break;
    }
  }
}

/**
 * Optimized scanning of DOM for price conversions
 * @param {Document|Element} root - The root element to scan
 * @param {number} btcPrice - Bitcoin price
 * @param {number} satPrice - Satoshi price
 */
export function scanDomForPrices(root, btcPrice, satPrice) {
  if (!root) return;
  
  // First, do a targeted scan of likely price elements
  const priceElements = findPriceElements(root);
  
  for (const element of priceElements) {
    // Already processed elements will be skipped internally
    walkDomTree(element, btcPrice, satPrice, true);
  }
  
  // Then do a complete scan of the DOM to catch any missed prices
  // This ensures we don't miss anything while still being performant for most cases
  walkDomTree(root, btcPrice, satPrice, false);
}

/**
 * Initialize scanning for a page
 * @param {Document} document - The document to scan
 * @param {number} btcPrice - Bitcoin price
 * @param {number} satPrice - Satoshi price
 */
export function initScanning(document, btcPrice, satPrice) {
  // Reset the processed nodes cache
  processedNodes.clear();
  
  // Scan the visible DOM first
  scanDomForPrices(document.body, btcPrice, satPrice);
  
  // Set up an IntersectionObserver for lazy processing
  if (window.IntersectionObserver) {
    setupLazyProcessing(document, btcPrice, satPrice);
  }
}

/**
 * Set up lazy processing of off-screen content
 * @param {Document} document - The document to scan
 * @param {number} btcPrice - Bitcoin price
 * @param {number} satPrice - Satoshi price
 */
export function setupLazyProcessing(document, btcPrice, satPrice) {
  // Create an observer for elements entering the viewport
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          // Process the element that just became visible
          walkDomTree(entry.target, btcPrice, satPrice, false);
          // Unobserve it after processing
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '200px' } // Start loading when within 200px of viewport
  );
  
  // Observe all potential containers in the page
  const containers = document.querySelectorAll('main, section, article, .content, #content, [role="main"]');
  for (const container of containers) {
    observer.observe(container);
  }
  
  // Also watch for scrolling to trigger additional processing
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    
    scrollTimeout = setTimeout(() => {
      // Find elements that might be newly visible
      const visibleElements = document.querySelectorAll('div:not([data-btc-processed])');
      for (const el of visibleElements) {
        if (isNodeVisible(el)) {
          el.setAttribute('data-btc-processed', 'true');
          walkDomTree(el, btcPrice, satPrice, false);
        }
      }
    }, 200);
  }, { passive: true });
}

/**
 * Set up MutationObserver for dynamic content
 * @param {Document} document - The document to observe
 * @param {number} btcPrice - Bitcoin price
 * @param {number} satPrice - Satoshi price
 * @param {Object} observerConfig - Optional configuration for the observer
 */
export function setupMutationObserver(document, btcPrice, satPrice, observerConfig = {
  childList: true,
  subtree: true
}) {
  // Use a debounced version of processing to avoid excessive work on large updates
  let processingTimeout;
  const pendingNodes = new Set();
  
  const observer = new MutationObserver((mutations) => {
    let hasNewNodes = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Process newly added nodes
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          // Only process element nodes and skip already processed ones
          if (node.nodeType === 1 && !processedNodes.has(node)) {
            pendingNodes.add(node);
            hasNewNodes = true;
          }
        }
      }
    }
    
    if (hasNewNodes) {
      // Clear existing timeout for processing
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
      
      // Batch process after a short delay
      processingTimeout = setTimeout(() => {
        pendingNodes.forEach(node => {
          walkDomTree(node, btcPrice, satPrice, false);
        });
        pendingNodes.clear();
      }, 50);
    }
  });
  
  // Start observing with the provided configuration
  observer.observe(document.body, observerConfig);
  
  return observer;
}