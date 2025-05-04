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
} from '/conversion.js';

import {
  debounce,
  throttle,
  batchProcessor
} from '/debounce.js';

// Cache for processed nodes to avoid re-processing
// Using a variable to hold the WeakSet instance so we can replace it
// WeakSet doesn't have a clear() method, so we'll create a new instance when needed
let processedNodes = new WeakSet();

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
 * 
 * This function handles Amazon's unique price component structure where the price is split
 * across multiple DOM elements: currency symbol, whole number, and fraction parts.
 * 
 * @param {Element} node - DOM element that might be a price component
 * @param {number} btcPrice - Bitcoin price
 * @param {number} satPrice - Satoshi price
 * @returns {Object} Processing result including next node
 */
export function processAmazonPrice(node, next, btcPrice, satPrice) {
  let processed = false;
  let nextNode = next;
  
  try {
    // Check if this is a node we can process
    if (!node || node.nodeType !== 1 || !node.classList) {
      return { processed, nextNode };
    }
    
    // Skip if this node is already marked as processed by our extension
    if (node.hasAttribute && node.hasAttribute('data-btc-processed')) {
      return { processed, nextNode };
    }
    
    // Find the root price element (container)
    const priceContainer = findAmazonPriceContainer(node);
    
    // If this is a price container node, process the whole price structure
    if (priceContainer) {
      // Check if already processed
      if (priceContainer.hasAttribute && priceContainer.hasAttribute('data-btc-processed')) {
        return { processed, nextNode: null, price: null, processedContainer: true };
      }
      
      // Mark as processed to avoid duplicate processing
      priceContainer.setAttribute('data-btc-processed', 'true');
      
      // Extract each component from the container
      const components = extractAmazonPriceComponents(priceContainer);
      
      if (components.symbol && components.whole) {
        // Construct the complete price text with proper formatting
        const fullPriceText = `${components.symbol}${components.whole}${components.fraction ? '.' + components.fraction : ''}`;
        
        // Get the numeric value for conversion
        const numericValue = parseFloat(
          `${components.whole.replace(/,/g, '')}${components.fraction ? '.' + components.fraction : ''}`
        );
        
        if (!isNaN(numericValue) && numericValue > 0) {
          try {
            // Import the makeSnippet function if we have access to it
            const { valueFriendly } = window.bitcoinPriceTagBridge?.conversionUtils || {};
            
            // Create a new element with the complete price and conversion
            const newPriceNode = document.createElement('div');
            newPriceNode.className = 'btc-price-converted-amazon';
            
            // If we have access to the conversion utilities through the bridge
            if (valueFriendly) {
              const btcValue = valueFriendly(numericValue, satPrice);
              newPriceNode.innerHTML = `
                <span class="original-price">${fullPriceText}</span>
                <span class="btc-price-tag-converted">${btcValue}</span>
              `;
            } else {
              // Otherwise use the less optimal but functional approach
              newPriceNode.textContent = fullPriceText;
              
              // Convert the complete price text in the new node
              if (newPriceNode.firstChild) {
                convertPriceText(newPriceNode.firstChild, btcPrice, satPrice);
              }
            }
            
            // Add tooltip if price data might be stale
            if (window.bitcoinPriceTagBridge?.priceDataInfo?.freshness &&
                window.bitcoinPriceTagBridge.priceDataInfo.freshness !== 'fresh') {
              newPriceNode.classList.add('btc-price-tooltip');
              newPriceNode.setAttribute('data-tooltip', 'Bitcoin price data may not be current');
              
              // Add visual indicator of freshness
              const statusIndicator = document.createElement('span');
              statusIndicator.className = `btc-price-status ${window.bitcoinPriceTagBridge.priceDataInfo.freshness}`;
              newPriceNode.appendChild(statusIndicator);
            }
            
            // Insert the new node after the price container
            priceContainer.parentNode.insertBefore(newPriceNode, priceContainer.nextSibling);
            
            // Hide the original price components
            // Using opacity and height transformations for a smoother experience
            priceContainer.style.opacity = '0';
            priceContainer.style.height = '0';
            priceContainer.style.overflow = 'hidden';
            priceContainer.style.margin = '0';
            priceContainer.style.padding = '0';
            
            // Mark all child elements as processed
            const allChildren = priceContainer.querySelectorAll('*');
            for (const child of allChildren) {
              if (child.setAttribute) {
                child.setAttribute('data-btc-processed', 'true');
              }
            }
            
            processed = true;
          } catch (convError) {
            console.error('Error applying Bitcoin conversion to Amazon price:', convError);
          }
        }
      }
      
      // We've processed the entire price container, so skip remaining price components
      return { processed, nextNode: null, price: null, processedContainer: true };
    }
    
    // For backwards compatibility, handle specific Amazon price components individually
    // This primarily serves as a fallback for older Amazon layouts and as a safety net
    const classes = node.classList;
    
    if (["sx-price-currency", "a-price-symbol", "a-offscreen"].some(c => classes.contains(c)) && node.firstChild) {
      // Mark currency symbols as processed
      node.setAttribute('data-btc-processed', 'true');
      processed = true;
    } 
    else if (["sx-price-whole", "a-price-whole", "a-price-decimal"].some(c => classes.contains(c)) && 
        node.firstChild && next?.firstChild) {
      // Mark price whole parts as processed
      node.setAttribute('data-btc-processed', 'true');
      if (next.setAttribute) {
        next.setAttribute('data-btc-processed', 'true');
      }
      nextNode = next;
      processed = true;
    } 
    else if (["sx-price-fractional", "a-price-fraction"].some(c => classes.contains(c)) && node.firstChild) {
      // Mark fractional parts as processed
      node.setAttribute('data-btc-processed', 'true');
      processed = true;
    }
  } catch (e) {
    console.error('Error processing Amazon price element:', e);
  }
  
  return { 
    processed, 
    nextNode, 
    price: null
  };
}

/**
 * Find the container element for Amazon price components
 * @param {Element} node - A node that might be part of an Amazon price
 * @returns {Element|null} The container element or null
 */
function findAmazonPriceContainer(node) {
  // Try to find the common parent element containing all price components
  let current = node;
  
  // Amazon price container class patterns
  const amazonPriceContainerClasses = [
    'a-price',            // Standard Amazon price container
    'sx-price',           // Amazon Seller Central price container
    'a-text-price',       // Text-based price format
    'a-price-range',      // Price range container
    'a-offscreen',        // Offscreen price for accessibility
    'twister-plus-price-data-price', // Another price container variant
    'apexPriceToPay',     // Deal price container
    'dealPriceText',      // Another deal price format
    'a-color-price'       // Colored price text
  ];
  
  // Look for up to 4 levels up the DOM tree (increased from 3)
  for (let i = 0; i < 4; i++) {
    if (!current || !current.parentElement) return null;
    
    current = current.parentElement;
    
    // Skip nodes without classes
    if (!current.classList) continue;
    
    // Check if this is a price container by class name
    if (amazonPriceContainerClasses.some(className => current.classList.contains(className))) {
      return current;
    }
    
    // Additional detection for complex price structures
    // Check if this element contains required price components
    if (current.querySelector && (
        (current.querySelector('.a-price-symbol, .sx-price-currency') && 
         current.querySelector('.a-price-whole, .sx-price-whole')) ||
        (current.querySelector('[class*="price"], [id*="price"]') && 
         current.querySelector('[class*="symbol"], [class*="currency"]'))
    )) {
      return current;
    }
  }
  
  return null;
}

/**
 * Extract Amazon price components from a container element
 * @param {Element} container - The price container element
 * @returns {Object} Object containing symbol, whole, and fraction parts
 */
function extractAmazonPriceComponents(container) {
  const components = {
    symbol: '',
    whole: '',
    fraction: ''
  };
  
  try {
    // Try structured component extraction first
    // Extract the currency symbol
    const symbolElement = container.querySelector('.a-price-symbol, .sx-price-currency, [class*="currency"], [class*="symbol"]');
    if (symbolElement && symbolElement.textContent) {
      components.symbol = symbolElement.textContent.trim();
    }
    
    // Extract the whole number part
    const wholeElement = container.querySelector('.a-price-whole, .sx-price-whole, [class*="whole"]');
    if (wholeElement && wholeElement.textContent) {
      components.whole = wholeElement.textContent.trim();
    }
    
    // Extract the fraction part
    const fractionElement = container.querySelector('.a-price-fraction, .sx-price-fractional, [class*="fraction"]');
    if (fractionElement && fractionElement.textContent) {
      components.fraction = fractionElement.textContent.trim();
    }
    
    // If we couldn't extract structured components, try to parse from complete text
    if (!components.symbol || !components.whole) {
      const fullPriceText = container.textContent.trim();
      if (fullPriceText) {
        // Use regex to extract components from the full text
        const priceMatch = fullPriceText.match(/([^\d]*)(\d[\d,]*)\.?(\d*)/);
        
        if (priceMatch) {
          // Group 1 is the symbol, group 2 is the whole part, group 3 is the fraction part
          components.symbol = components.symbol || priceMatch[1] || '$';
          components.whole = components.whole || priceMatch[2] || '';
          components.fraction = components.fraction || priceMatch[3] || '';
        }
      }
    }
    
    // Clean up components
    // Ensure symbol is a currency symbol
    if (!components.symbol || components.symbol === '') {
      components.symbol = '$'; // Default to $ if no symbol found
    } else if (!/[$€£¥₹]/.test(components.symbol)) {
      // If symbol doesn't contain a currency character, check for currency text
      if (/usd|dollar/i.test(components.symbol)) {
        components.symbol = '$';
      } else if (/eur|euro/i.test(components.symbol)) {
        components.symbol = '€';
      } else if (/gbp|pound/i.test(components.symbol)) {
        components.symbol = '£';
      } else {
        components.symbol = '$'; // Default fallback
      }
    }
    
    // If we have no whole part but have a symbol, try a different approach
    if ((!components.whole || components.whole === '') && components.symbol) {
      const fullText = container.textContent.trim();
      const numericMatch = fullText.match(/\d[\d,.]*/);
      if (numericMatch) {
        const numericPart = numericMatch[0];
        const decimalSplit = numericPart.split('.');
        
        if (decimalSplit.length > 1) {
          components.whole = decimalSplit[0];
          components.fraction = decimalSplit[1];
        } else {
          components.whole = numericPart;
        }
      }
    }
  } catch (e) {
    console.error('Error extracting Amazon price components:', e);
  }
  
  return components;
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
            const { processed, nextNode, processedContainer } = processAmazonPrice(child, child.nextSibling, btcPrice, satPrice);
            if (processed) {
              // If we processed an entire container, skip this branch of the tree
              if (processedContainer) {
                // Mark the entire container and its children as processed to avoid duplicate processing
                const container = findAmazonPriceContainer(child);
                if (container) {
                  processedNodes.add(container);
                  // Mark all children as processed
                  const allChildren = container.querySelectorAll('*');
                  for (const element of allChildren) {
                    processedNodes.add(element);
                  }
                }
                
                // Skip to the next sibling of the container
                child = prev;
                continue;
              }
              
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
 * Check if we're in a cross-origin iframe where DOM access may be restricted
 * @returns {Object} Details about the restricted status
 */
export function isInRestrictedIframe() {
  const result = {
    restricted: false,
    reason: null,
    details: {}
  };
  
  try {
    // Check if we're in an iframe at all
    result.details.isIframe = window !== window.top;
    if (!result.details.isIframe) {
      return result; // Not an iframe, so not restricted
    }
    
    // Check if window has a frameElement (not accessible in cross-origin iframes)
    try {
      result.details.hasFrameElement = !!window.frameElement;
    } catch (frameError) {
      result.details.hasFrameElement = false;
      result.details.frameElementError = true;
    }
    
    // Try to access the top window's location - this will throw in cross-origin iframes
    try {
      const parentOrigin = window.parent.location.origin;
      const currentOrigin = window.location.origin;
      result.details.parentOrigin = parentOrigin;
      result.details.currentOrigin = currentOrigin;
      result.details.differentOrigin = parentOrigin !== currentOrigin;
      
      if (result.details.differentOrigin) {
        result.restricted = true;
        result.reason = 'cross_origin';
      }
    } catch (originError) {
      result.restricted = true;
      result.reason = 'cross_origin_exception';
      result.details.originAccessError = true;
    }
    
    // Check for sandbox attribute on the iframe
    try {
      if (window.frameElement && window.frameElement.hasAttribute('sandbox')) {
        const sandboxValue = window.frameElement.getAttribute('sandbox');
        result.details.sandboxed = true;
        result.details.sandboxValue = sandboxValue;
        
        // Check if the sandbox is restrictive (doesn't allow scripts or same-origin)
        const allowScripts = sandboxValue.includes('allow-scripts');
        const allowSameOrigin = sandboxValue.includes('allow-same-origin');
        
        result.details.allowScripts = allowScripts;
        result.details.allowSameOrigin = allowSameOrigin;
        
        if (!allowScripts || !allowSameOrigin) {
          result.restricted = true;
          result.reason = result.reason || 'sandbox_restrictions';
        }
      }
    } catch (sandboxError) {
      // If we can't access frameElement, this will error which is already handled above
    }
    
    // Check for CSP headers that might restrict script execution
    // We can't directly access CSP, but we can try a basic test
    try {
      // Try to execute a simple inline script - if CSP blocks it, this will fail
      result.details.inlineScriptBlocked = false;
      
      // Check for CSP headers indirectly
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (cspMeta) {
        const cspContent = cspMeta.getAttribute('content');
        result.details.hasCSPMeta = true;
        result.details.cspContent = cspContent;
        
        // Check if CSP blocks script-src 'unsafe-inline'
        if (cspContent && 
            cspContent.includes('script-src') && 
            !cspContent.includes('unsafe-inline')) {
          result.restricted = true;
          result.reason = result.reason || 'csp_restrictions';
        }
      }
    } catch (cspError) {
      // CSP check failed, which might indicate restrictions
      result.restricted = true;
      result.reason = result.reason || 'csp_exception';
      result.details.cspCheckError = true;
    }
    
    // If we're restricted, log the details at debug level
    if (result.restricted) {
      console.debug('Bitcoin Price Tag: Detected restricted iframe', {
        reason: result.reason,
        details: result.details
      });
    }
    
    return result;
  } catch (e) {
    // If an unexpected error occurs in our detection logic, consider it restricted
    console.warn('Bitcoin Price Tag: Error detecting iframe restrictions, assuming restricted', e.message);
    return {
      restricted: true,
      reason: 'detection_error',
      details: { detectionError: e.message }
    };
  }
}

/**
 * Check if current page is in an Amazon iframe with typical restrictions
 * @returns {Object} Details about the Amazon frame
 */
export function isAmazonRestrictedIframe() {
  const result = {
    isAmazon: false,
    restricted: false,
    reason: null,
    details: {}
  };
  
  try {
    // Check if we're on an Amazon domain
    const hostname = window.location.hostname || '';
    result.details.hostname = hostname;
    
    // Check for various Amazon domains (including international)
    const amazonDomains = [
      'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 
      'amazon.it', 'amazon.es', 'amazon.ca', 'amazon.in', 
      'amazon.com.mx', 'amazon.com.br', 'amazon.com.au',
      'amazon.co.jp', 'amazon.cn', 'amazon.nl', 'amazon.sg',
      'amazon.ae', 'amzn', 'a2z', 'amazon-adsystem'
    ];
    
    result.isAmazon = amazonDomains.some(domain => hostname.includes(domain));
    result.details.isAmazonDomain = result.isAmazon;
    
    // Also check the URL path for Amazon identifiers
    const url = window.location.href || '';
    result.details.url = url;
    
    // Check for Amazon-specific URL patterns
    const amazonUrlPatterns = [
      '/gp/product/', '/dp/', '/Amazon', '/amzn', 
      'advertising', 'adsystem', 'adserver'
    ];
    
    if (!result.isAmazon) {
      result.isAmazon = amazonUrlPatterns.some(pattern => url.includes(pattern));
      result.details.hasAmazonUrlPattern = result.isAmazon;
    }
    
    // Check if we're in an iframe
    result.details.isIframe = window !== window.top;
    
    // Only continue checks if we're on Amazon and in an iframe
    if (result.isAmazon && result.details.isIframe) {
      // Check URL for specific Amazon iframe contexts known to be restricted
      const restrictedUrlPatterns = [
        'adSystem', 'adsystem', 'adserver', 'advertising', 
        'creatives', 'widget', 'recommendations', '/recs/', 
        'iframe', 'sandbox', 'popover', 'modal', 'overlay'
      ];
      
      result.details.hasRestrictedUrlPattern = restrictedUrlPatterns.some(pattern => 
        url.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (result.details.hasRestrictedUrlPattern) {
        result.restricted = true;
        result.reason = 'amazon_restricted_url';
      }
      
      // Check for Amazon-specific DOM elements that indicate a restricted iframe
      try {
        if (document.body) {
          result.details.hasPopoverClass = document.body.classList.contains('ap_popover_content');
          result.details.hasOverlayClass = document.body.classList.contains('a-overlay') ||
                                         document.body.classList.contains('aok-overlay');
          result.details.hasModalClass = document.body.classList.contains('a-modal') ||
                                       document.body.classList.contains('a-popover');
          
          // Check for ad-related divs and classes
          result.details.hasAdClass = !!document.querySelector('[id*="ad-"], [class*="ad-"], [id*="ads"], [class*="ads"]');
          
          if (result.details.hasPopoverClass || 
              result.details.hasOverlayClass || 
              result.details.hasModalClass ||
              result.details.hasAdClass) {
            result.restricted = true;
            result.reason = result.reason || 'amazon_restricted_content';
          }
        }
      } catch (domError) {
        // Error accessing DOM information suggests restrictions
        result.restricted = true;
        result.reason = 'amazon_dom_error';
        result.details.domError = domError.message;
      }
      
      // Check iframe size - Amazon often uses tiny iframes for ads
      try {
        const smallIframeThreshold = 350; // pixels
        const width = window.innerWidth || document.documentElement.clientWidth;
        const height = window.innerHeight || document.documentElement.clientHeight;
        
        result.details.frameWidth = width;
        result.details.frameHeight = height;
        result.details.isSmallFrame = width < smallIframeThreshold || height < smallIframeThreshold;
        
        if (result.details.isSmallFrame) {
          result.restricted = true;
          result.reason = result.reason || 'amazon_small_frame';
        }
      } catch (sizeError) {
        // Ignore size errors
      }
    }
    
    // If it's an Amazon iframe and we couldn't explicitly determine it's unrestricted,
    // treat it as restricted to be safe
    if (result.isAmazon && result.details.isIframe && !result.restricted) {
      const generalRestrictions = isInRestrictedIframe();
      if (generalRestrictions.restricted) {
        result.restricted = true;
        result.reason = 'general_restrictions';
        result.details.generalRestrictions = generalRestrictions;
      }
    }
    
    // Log detailed information about Amazon iframes at debug level
    if (result.isAmazon && result.details.isIframe) {
      console.debug('Bitcoin Price Tag: Detected Amazon iframe', {
        restricted: result.restricted,
        reason: result.reason,
        details: result.details
      });
    }
    
    return result;
  } catch (e) {
    // If anything fails, assume it's a restricted context for safety
    console.warn('Bitcoin Price Tag: Error detecting Amazon iframe, assuming restricted', e.message);
    return {
      isAmazon: true, // Assume it's Amazon if detection fails
      restricted: true,
      reason: 'detection_error',
      details: { error: e.message }
    };
  }
}

/**
 * Initialize scanning for a page
 * @param {Document} document - The document to scan
 * @param {number} btcPrice - Bitcoin price
 * @param {number} satPrice - Satoshi price
 * @returns {Object} Information about why scanning was skipped, if applicable
 */
export function initScanning(document, btcPrice, satPrice) {
  // Reset the processed nodes cache by creating a new WeakSet instance
  // (WeakSet doesn't have a clear() method)
  processedNodes = new WeakSet();
  
  // First check for general iframe restrictions
  const iframeRestrictions = isInRestrictedIframe();
  
  // Then check specifically for Amazon iframe restrictions
  const amazonRestrictions = isAmazonRestrictedIframe();
  
  // Combine the results - if either detection indicates restrictions, we should skip
  const isRestricted = iframeRestrictions.restricted || 
                      (amazonRestrictions.isAmazon && amazonRestrictions.restricted);
  
  // If we're in a restricted context, skip DOM scanning
  if (isRestricted) {
    const reason = amazonRestrictions.restricted ? 
                 `Amazon restricted frame: ${amazonRestrictions.reason}` : 
                 `Restricted iframe: ${iframeRestrictions.reason}`;
    
    console.warn(`Bitcoin Price Tag: Skipping DOM scanning in restricted context - ${reason}`);
    
    return {
      skipped: true,
      reason: reason,
      restrictionDetails: {
        isAmazon: amazonRestrictions.isAmazon,
        generalRestrictions: iframeRestrictions,
        amazonRestrictions: amazonRestrictions.isAmazon ? amazonRestrictions : null
      }
    };
  }
  
  // Check if the document and body are accessible
  if (!document || !document.body) {
    console.warn('Bitcoin Price Tag: Invalid document or document.body not available');
    return {
      skipped: true,
      reason: 'invalid_document'
    };
  }
  
  // If we're here, the context is suitable for scanning
  try {
    // Scan the visible DOM first
    scanDomForPrices(document.body, btcPrice, satPrice);
    
    // Set up an IntersectionObserver for lazy processing
    if (window.IntersectionObserver) {
      setupLazyProcessing(document, btcPrice, satPrice);
    }
    
    return {
      skipped: false
    };
  } catch (e) {
    console.error('Bitcoin Price Tag: Error initializing scanning', e);
    return {
      skipped: true,
      reason: 'scanning_error',
      error: e.message
    };
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
  
  // Create a throttled scroll handler
  const throttledScrollHandler = throttle(() => {
    // Find elements that might be newly visible
    const visibleElements = document.querySelectorAll('div:not([data-btc-processed])');
    
    // Process in batches to avoid blocking the main thread
    let index = 0;
    
    const processBatch = () => {
      const endIndex = Math.min(index + 10, visibleElements.length);
      
      // Process a batch of 10 elements
      for (let i = index; i < endIndex; i++) {
        const el = visibleElements[i];
        if (isNodeVisible(el)) {
          el.setAttribute('data-btc-processed', 'true');
          walkDomTree(el, btcPrice, satPrice, false);
        }
      }
      
      // Continue with next batch if more elements
      index = endIndex;
      if (index < visibleElements.length) {
        setTimeout(processBatch, 0);
      }
    };
    
    // Start processing
    processBatch();
  }, 200, { leading: true, trailing: true });
  
  // Add the throttled scroll listener
  window.addEventListener('scroll', throttledScrollHandler, { passive: true });
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
  // Create a batch processor for DOM nodes
  // This processes nodes in batches of up to 10 with a 100ms delay
  const batchWalker = batchProcessor((nodes) => {
    for (const node of nodes) {
      if (node.nodeType === 1 && !processedNodes.has(node)) {
        walkDomTree(node, btcPrice, satPrice, false);
      }
    }
    return Promise.resolve();
  }, 100, 10);
  
  // Create a throttled processor for high-frequency mutations
  // This ensures we process at most once every 150ms during rapid DOM changes
  const throttledProcessMutations = throttle((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Process newly added nodes
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          // Queue node for processing
          if (node.nodeType === 1) {
            batchWalker(node);
          }
        }
      }
    }
  }, 150);
  
  // Set up the mutation observer
  const observer = new MutationObserver((mutations) => {
    // Use throttled processor to handle mutations
    throttledProcessMutations(mutations);
  });
  
  // Start observing with the provided configuration
  observer.observe(document.body, observerConfig);
  
  return observer;
}