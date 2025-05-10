/**
 * DOM Scanning Algorithm
 * 
 * Optimized functions for scanning the DOM and converting currency values
 */

/* eslint-disable max-depth, no-unused-vars */
// This file intentionally contains deeply nested code blocks for comprehensive
// error handling and resilient DOM manipulation. The deep nesting is necessary
// to safely handle various edge cases and browser differences, especially on
// complex pages like Amazon where DOM structure is unpredictable.
//
// Note: Many catch blocks capture error variables that aren't directly used but
// could be used in the future for enhanced error reporting. ESLint warnings for 
// these variables are intentionally disabled as they're part of our error handling 
// architecture and maintain consistency across catch blocks.

import {
  buildPrecedingMatchPattern,
  buildConcludingMatchPattern,
  extractNumericValue,
  getMultiplier,
  makeSnippet,
} from '/conversion.js';
import {
  throttle,
  batchProcessor,
} from '/debounce.js';

// Cache for processed nodes to avoid re-processing
// Using a variable to hold the WeakSet instance so we can replace it
// WeakSet doesn't have a clear() method, so we'll create a new instance when needed
let processedNodes = new WeakSet();

// Elements that are unlikely to contain price text
const SKIP_TAGS = new Set([
  'script', 'style', 'noscript', 'svg', 'canvas', 'video', 'audio', 
  'img', 'iframe', 'meta', 'link', 'head', 'template', 'input', 'textarea',
]);

// Common price-related class names and identifiers
const PRICE_SELECTORS = [
  '.price', '.cost', '.amount', '.fee', '.total', '*[class*="price"]', 
  '*[class*="cost"]', '*[class*="amount"]', '*[id*="price"]', '*[id*="cost"]',
  '*[class*="currency"]', '*[class*="usd"]', '*[class*="total"]',
  '*[class*="dollars"]', '.a-price', '.sx-price', '*[class*="product"]',
  '*[id*="product-price"]', 'span.money',
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
/**
 * Safely check if a value is a text node
 * Works even in environments where Node is not defined
 * @param {any} value - The value to check
 * @returns {boolean} True if the value is a text node
 */
function isTextNode(value) {
  if (!value) return false;
  // Use direct property checking rather than instanceof
  return typeof value.nodeType === 'number' && value.nodeType === 3 && 
         typeof value.nodeValue === 'string';
}



export function convertPriceText(textNode, btcPrice, satPrice) {
  // Use safer type checking that doesn't rely on Node global
  if (!isTextNode(textNode) || !textNode.nodeValue || textNode.nodeValue.trim() === '') {
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
 * Enhanced with defensive checks, error handling, and restricted context awareness.
 * 
 * @param {Element} node - DOM element that might be a price component
 * @param {Element|null} next - Next node in sequence, may be null
 * @param {number} btcPrice - Bitcoin price
 * @param {number} satPrice - Satoshi price
 * @param {Object} [options] - Additional options for processing
 * @param {boolean} [options.isRestrictedContext] - Whether we're in a restricted context
 * @param {boolean} [options.isAmazonRestricted] - Whether we're in a restricted Amazon iframe
 * @param {string} [options.restrictionReason] - Reason for restriction if applicable
 * @returns {Object} Processing result including next node and status information
 */
/**
 * Function is necessarily complex due to the comprehensive error handling required
 * for safely dealing with Amazon's complex price formatting and DOM structure.
 * The complexity is justified for ensuring robustness in all scenarios.
 */
/* eslint-disable complexity */
export function processAmazonPrice(node, next, btcPrice, satPrice, options = {}) {
  // Default result structure
  const result = {
    processed: false,
    nextNode: next,
    price: null,
    processedContainer: false,
    error: null,
    skippedDueToRestrictions: false,
  };
  
  // Early exit if context is known to be restricted
  if (options.isRestrictedContext || options.isAmazonRestricted) {
    result.skippedDueToRestrictions = true;
    result.restrictionReason = options.restrictionReason || 'unknown_restriction';
    return result;
  }
  
  // Early validation of parameters
  if (!node) {
    result.error = 'null_node';
    return result; 
  }
  
  if (!btcPrice || isNaN(btcPrice) || btcPrice <= 0) {
    result.error = 'invalid_btc_price';
    return result;
  }
  
  if (!satPrice || isNaN(satPrice) || satPrice <= 0) {
    result.error = 'invalid_sat_price';
    return result;
  }
  
  try {
    // Ensure this is an element node with proper interface
    if (node.nodeType !== 1) {
      result.error = 'not_element_node';
      return result;
    }
    
    // Check if classList is available - if not, we can't process this node
    if (!node.classList) {
      result.error = 'no_classlist';
      return result;
    }
    
    // Skip invalid nodes
    if (typeof node.hasAttribute !== 'function') {
      result.error = 'no_hasAttribute_method';
      return result;
    }
    
    // Skip if this node is already marked as processed by our extension
    if (node.hasAttribute('data-btc-processed')) {
      result.processed = true; // Mark as processed even though we're skipping
      return result;
    }
    
    // Attempt to find the root price container, with error handling
    let priceContainer = null;
    try {
      priceContainer = findAmazonPriceContainer(node);
    } catch (containerError) {
      console.debug('Bitcoin Price Tag: Error finding Amazon price container', containerError.message);
      result.error = 'container_detection_error';
      return result;
    }
    
    // If this is a price container node, process the whole price structure
    if (priceContainer) {
      try {
        // Verify the price container is valid
        if (!priceContainer || 
            typeof priceContainer.hasAttribute !== 'function' || 
            typeof priceContainer.setAttribute !== 'function') {
          result.error = 'invalid_price_container';
          return result;
        }
        
        // Check if already processed
        if (priceContainer.hasAttribute('data-btc-processed')) {
          result.processed = true;
          result.processedContainer = true;
          result.nextNode = null;
          return result;
        }
        
        // Try to safely mark as processed to avoid duplicate processing
        try {
          priceContainer.setAttribute('data-btc-processed', 'true');
        } catch (attrError) {
          // If we can't set attributes, we're in a restricted context
          result.error = 'attribute_restriction';
          return result;
        }
        
        // Extract price components with safety checks
        let components = null;
        try {
          components = extractAmazonPriceComponents(priceContainer);
        } catch (extractError) {
          console.debug('Bitcoin Price Tag: Error extracting Amazon price components', extractError.message);
          result.error = 'component_extraction_error';
          return result;
        }
        
        // Safety check on extracted components
        if (!components || !components.symbol || !components.whole) {
          result.error = 'incomplete_price_components';
          return result;
        }
        
        // Construct the complete price text with proper formatting
        const fullPriceText = `${components.symbol}${components.whole}${components.fraction ? '.' + components.fraction : ''}`;
        
        // Get the numeric value for conversion with robust parsing
        let numericValue = 0;
        try {
          // Remove any commas or other non-numeric characters except for the decimal point
          const wholeClean = components.whole.replace(/[^\d]/g, '');
          const fractionPart = components.fraction ? `.${components.fraction.replace(/[^\d]/g, '')}` : '';
          numericValue = parseFloat(`${wholeClean}${fractionPart}`);
        } catch (parseError) {
          result.error = 'price_parse_error';
          return result;
        }
        
        // Only proceed if we have valid numeric values
        if (!isNaN(numericValue) && numericValue > 0) {
          try {
            // Verify that we can access the DOM for creating new elements
            if (typeof document === 'undefined' || 
                typeof document.createElement !== 'function') {
              result.error = 'document_access_restricted';
              return result;
            }
            
            // Check if we can access parent Node - required for DOM insertion
            if (!priceContainer.parentNode || 
                typeof priceContainer.parentNode.insertBefore !== 'function') {
              result.error = 'parent_node_access_restricted';
              return result;
            }
            
            // Try to safely create a new element - this can fail in restricted contexts
            let newPriceNode = null;
            try {
              newPriceNode = document.createElement('div');
              newPriceNode.className = 'btc-price-converted-amazon';
            } catch (elementError) {
              result.error = 'element_creation_restricted';
              return result;
            }
            
            // Determine the conversion method depending on available utilities
            const bridgeAvailable = typeof window !== 'undefined' && 
                                  window.bitcoinPriceTagBridge && 
                                  window.bitcoinPriceTagBridge.conversionUtils;
            
            if (bridgeAvailable && 
                typeof window.bitcoinPriceTagBridge.conversionUtils.valueFriendly === 'function') {
              // Use bridge conversion utilities if available
              try {
                const btcValue = window.bitcoinPriceTagBridge.conversionUtils.valueFriendly(numericValue, satPrice);
                
                // Verify btcValue is valid before using it
                if (btcValue && typeof btcValue === 'string') {
                  newPriceNode.innerHTML = `
                    <span class="original-price">${fullPriceText}</span>
                    <span class="btc-price-tag-converted">${btcValue}</span>
                  `;
                } else {
                  // Fallback to basic text if conversion didn't work
                  newPriceNode.textContent = fullPriceText;
                }
              } catch (bridgeConversionError) {
                // Fallback to basic text if bridge conversion fails
                newPriceNode.textContent = fullPriceText;
                console.debug('Bitcoin Price Tag: Bridge conversion error', bridgeConversionError.message);
              }
            } else {
              // Fallback to direct text approach if bridge not available
              newPriceNode.textContent = fullPriceText;
              
              // Try to convert the text node if one is created
              try {
                if (newPriceNode.firstChild && newPriceNode.firstChild.nodeType === 3) {
                  convertPriceText(newPriceNode.firstChild, btcPrice, satPrice);
                }
              } catch (textConversionError) {
                console.debug('Bitcoin Price Tag: Text conversion error', textConversionError.message);
              }
            }
            
            // Add freshness indicators if bridge provides them
            try {
              if (window.bitcoinPriceTagBridge?.priceDataInfo?.freshness &&
                  window.bitcoinPriceTagBridge.priceDataInfo.freshness !== 'fresh') {
                newPriceNode.classList.add('btc-price-tooltip');
                newPriceNode.setAttribute('data-tooltip', 'Bitcoin price data may not be current');
                
                // Add visual indicator of freshness
                try {
                  const statusIndicator = document.createElement('span');
                  statusIndicator.className = `btc-price-status ${window.bitcoinPriceTagBridge.priceDataInfo.freshness}`;
                  newPriceNode.appendChild(statusIndicator);
                } catch (indicatorError) {
                  // Non-critical, just log and continue
                  console.debug('Bitcoin Price Tag: Error adding status indicator', indicatorError.message);
                }
              }
            } catch (freshnessError) {
              // Non-critical error, just log and continue
              console.debug('Bitcoin Price Tag: Error checking data freshness', freshnessError.message);
            }
            
            // Safely insert the new price node into the DOM
            try {
              priceContainer.parentNode.insertBefore(newPriceNode, priceContainer.nextSibling);
              
              // Try to hide the original price with fallbacks if style setting fails
              try {
                // First try to set styles directly using CSS
                priceContainer.style.opacity = '0';
                priceContainer.style.height = '0';
                priceContainer.style.overflow = 'hidden';
                priceContainer.style.margin = '0';
                priceContainer.style.padding = '0';
              } catch (styleError) {
                // If direct style setting fails, try alternative methods
                try {
                  // Add a CSS class that hides the element
                  priceContainer.classList.add('btc-price-tag-hidden');
                } catch (classError) {
                  // If class addition also fails, try attribute-based approach
                  try {
                    priceContainer.setAttribute('hidden', 'true');
                  } catch (attrError) {
                    // Last resort: try to remove from DOM if we can
                    try {
                      if (priceContainer.parentNode) {
                        priceContainer.parentNode.removeChild(priceContainer);
                      }
                    } catch (removeError) {
                      // All hiding methods failed, just continue
                      console.debug('Bitcoin Price Tag: Unable to hide original price container');
                    }
                  }
                }
              }
              
              // Mark all children as processed if possible, with safety checks
              try {
                const allChildren = priceContainer.querySelectorAll('*');
                if (allChildren && allChildren.length > 0) {
                  for (let i = 0; i < allChildren.length; i++) {
                    const child = allChildren[i];
                    if (child && typeof child.setAttribute === 'function') {
                      try {
                        child.setAttribute('data-btc-processed', 'true');
                      } catch (childAttrError) {
                        // Non-critical, continue with next child
                      }
                    }
                  }
                }
              } catch (queryError) {
                // Non-critical, just log and continue
                console.debug('Bitcoin Price Tag: Error marking child elements as processed', queryError.message);
              }
              
              // Successfully processed
              result.processed = true;
              result.processedContainer = true;
              result.nextNode = null;
            } catch (domInsertError) {
              // Critical error: couldn't modify DOM
              console.debug('Bitcoin Price Tag: Error inserting price node into DOM', domInsertError.message);
              result.error = 'dom_insertion_error';
              return result;
            }
          } catch (convError) {
            console.debug('Bitcoin Price Tag: Error applying conversion to Amazon price', convError.message);
            result.error = 'conversion_error';
            return result;
          }
        } else {
          result.error = 'invalid_numeric_value';
          return result;
        }
      } catch (containerProcessError) {
        console.debug('Bitcoin Price Tag: Error processing price container', containerProcessError.message);
        result.error = 'container_process_error';
        return result;
      }
      
      // We've processed the entire price container, so skip remaining components
      result.nextNode = null;
      return result;
    }
    
    // Fallback logic for backwards compatibility - handle specific components
    try {
      // Check that we can access classList safely
      const classes = Array.from(node.classList || []);
      if (classes.length === 0) {
        result.error = 'empty_classlist';
        return result;
      }
      
      // Process currency symbols and price components
      const isCurrencySymbol = ['sx-price-currency', 'a-price-symbol', 'a-offscreen']
        .some(c => classes.includes(c));
      
      const isWholePart = ['sx-price-whole', 'a-price-whole', 'a-price-decimal']
        .some(c => classes.includes(c));
      
      const isFractionalPart = ['sx-price-fractional', 'a-price-fraction']
        .some(c => classes.includes(c));
      
      if (isCurrencySymbol && node.firstChild) {
        // Safely mark currency symbols as processed
        try {
          node.setAttribute('data-btc-processed', 'true');
          result.processed = true;
        } catch (attrError) {
          result.error = 'symbol_attribute_error';
        }
      } 
      else if (isWholePart && node.firstChild && next) {
        // Handle whole price parts with checks for next node
        try {
          node.setAttribute('data-btc-processed', 'true');
          
          // Check if next node can be accessed and marked
          if (next && typeof next.setAttribute === 'function') {
            try {
              next.setAttribute('data-btc-processed', 'true');
              result.nextNode = next;
            } catch (nextAttrError) {
              console.debug('Bitcoin Price Tag: Could not mark next node as processed', nextAttrError.message);
            }
          }
          
          result.processed = true;
        } catch (wholeAttrError) {
          result.error = 'whole_attribute_error';
        }
      } 
      else if (isFractionalPart && node.firstChild) {
        // Handle fractional parts
        try {
          node.setAttribute('data-btc-processed', 'true');
          result.processed = true;
        } catch (fractionAttrError) {
          result.error = 'fraction_attribute_error';
        }
      }
    } catch (fallbackError) {
      console.debug('Bitcoin Price Tag: Error in fallback component processing', fallbackError.message);
      result.error = 'fallback_processing_error';
    }
  } catch (e) {
    // Handle any unexpected errors
    console.error('Bitcoin Price Tag: Critical error processing Amazon price element:', e.message);
    result.error = 'critical_processing_error';
    result.errorDetails = e.message;
  }
  
  return result;
}

/**
 * Find the container element for Amazon price components
 * Enhanced with robust error handling, defensive coding, and context awareness
 * 
 * @param {Element} node - A node that might be part of an Amazon price
 * @param {Object} [options] - Additional options for processing
 * @param {boolean} [options.isRestrictedContext] - Whether we're in a restricted context
 * @param {boolean} [options.isAmazonRestricted] - Whether we're in a restricted Amazon iframe
 * @param {number} [options.maxLevels=4] - Maximum levels to traverse up the DOM tree
 * @returns {Element|null} The container element or null
 * @throws {Error} When DOM access is restricted
 */
function findAmazonPriceContainer(node, options = {}) {
  // Input validation with defensive coding
  if (!node) {
    return null;
  }
  
  // Early exit in restricted contexts
  if (options.isRestrictedContext || options.isAmazonRestricted) {
    return null;
  }
  
  // Maximum levels to search up the DOM tree
  const maxLevels = options.maxLevels || 4;
  
  try {
    // Try to find the common parent element containing all price components
    let current = node;
    
    // First verify we can access parentElement property
    let _canAccessDom = true;
    try {
      // Test DOM access - this will throw if access is restricted
      const _testAccess = node.parentElement;
      _canAccessDom = true;
    } catch (accessError) {
      // DOM access is restricted - we can't traverse the tree
      console.debug('Bitcoin Price Tag: Cannot access DOM tree for price container detection', {
        error: accessError.message,
      });
      _canAccessDom = false;
      throw new Error(`DOM access restricted: ${accessError.message}`);
    }
    
    // Amazon price container class patterns - comprehensive list
    const amazonPriceContainerClasses = [
      // Standard pricing classes
      'a-price',                  // Standard Amazon price container
      'sx-price',                 // Amazon Seller Central price container 
      'a-text-price',             // Text-based price format
      'a-price-range',            // Price range container
      'a-offscreen',              // Offscreen price for accessibility
      
      // Deal and special pricing classes
      'twister-plus-price-data-price',  // Variant price container
      'apexPriceToPay',           // Deal price container 
      'dealPriceText',            // Another deal price format
      'a-color-price',            // Colored price text
      'p13n-sc-price',            // Personalized recommendation price
      
      // More specific price containers
      'price-chunk',              // Price chunk container
      'price-section',            // Price section container
      'price-block',              // Price block container
      'product-price',            // Generic product price
      'display-price',            // Display price container
      'discount-price',           // Discount price container
      'a-price-whole-wrapper',    // Wrapper for whole price part
      'amazon-price',             // Generic Amazon price class
      'deal-price',               // Deal price display
      'price-large',              // Large price format 
      'price-small',               // Small price format
    ];
    
    // Look up the DOM tree for a matching container
    for (let i = 0; i < maxLevels; i++) {
      // Safety check to avoid traversal errors
      if (!current || !current.parentElement) {
        return null;
      }
      
      try {
        current = current.parentElement;
      } catch (traversalError) {
        console.debug('Bitcoin Price Tag: DOM traversal error', traversalError.message);
        return null; // Cannot traverse further
      }
      
      // Skip nodes without required DOM features
      if (!current.classList || typeof current.classList.contains !== 'function') {
        continue;
      }
      
      // Safety wrapper for classList checking
      let hasPriceClass = false;
      try {
        // Check if this is a price container by class name
        hasPriceClass = amazonPriceContainerClasses.some(className => 
          current.classList.contains(className),
        );
        
        if (hasPriceClass) {
          return current;
        }
      } catch (classCheckError) {
        console.debug('Bitcoin Price Tag: Error checking classList', classCheckError.message);
        // Continue searching - this node might be problematic but others could work
      }
      
      // Additional detection for complex price structures with DOM safety checks
      try {
        // Only attempt querySelector if the method exists
        if (current.querySelector && typeof current.querySelector === 'function') {
          // Check if this element contains required price components
          
          // First approach - check for specific Amazon price structure components
          let hasPriceComponents = false;
          
          try {
            hasPriceComponents = (
              (!!current.querySelector('.a-price-symbol, .sx-price-currency') && 
               !!current.querySelector('.a-price-whole, .sx-price-whole')) ||
              (!!current.querySelector('[class*="price"], [id*="price"]') && 
               !!current.querySelector('[class*="symbol"], [class*="currency"]'))
            );
          } catch (querySelectorError) {
            // If querySelector fails, try alternative detection
            console.debug('Bitcoin Price Tag: querySelector error in price container detection', {
              error: querySelectorError.message,
            });
            
            // Attempt a more direct check by examining child elements directly
            hasPriceComponents = false;
          }
          
          if (hasPriceComponents) {
            return current;
          }
          
          // Second approach - look for specific attribute combinations
          try {
            // If the element has a data-price or data-a-price attribute, it's likely a price container
            if (current.hasAttribute && 
                (current.hasAttribute('data-price') || 
                 current.hasAttribute('data-a-price') ||
                 current.hasAttribute('data-display-price'))) {
              return current;
            }
            
            // Check for price in element ID
            if (current.id && 
                (current.id.includes('price') || 
                 current.id.includes('Price') || 
                 current.id.includes('cost') || 
                 current.id.includes('Cost'))) {
              return current;
            }
          } catch (attributeError) {
            // Continue searching - attributes were inaccessible but other patterns might match
          }
          
          // Third approach - check for price-like patterns in element content
          try {
            const text = current.textContent || '';
            
            // Check if the node contains price-like text with currency symbol
            if (text.includes('$') && /\d+\.\d{2}/.test(text)) {
              // Contains dollar sign and decimal format (e.g., 19.99)
              return current;
            }
            
            // Check for common price phrases
            const pricePhrases = [
              'price:', 'price is', 'costs', 'on sale for', 
              'regular price', 'deal price', 'list price', 'sale price',
              'buy now for', 'your price',
            ];
            
            if (pricePhrases.some(phrase => 
              text.toLowerCase().includes(phrase.toLowerCase()),
            )) {
              return current;
            }
          } catch (contentError) {
            // Continue searching even if content is inaccessible
          }
        }
      } catch (complexDetectionError) {
        console.debug('Bitcoin Price Tag: Error in complex price structure detection', {
          error: complexDetectionError.message,
        });
        // Continue searching - this approach failed but others might work
      }
      
      // One more approach - check if the element has clear price-related styling
      try {
        if (window.getComputedStyle && current) {
          const style = window.getComputedStyle(current);
          // Amazon price elements often have specific font weights, sizes, or colors
          if ((style.fontWeight === 'bold' || parseInt(style.fontWeight, 10) >= 600) && 
              (style.fontSize && parseInt(style.fontSize, 10) >= 16) &&
              (style.color && 
               (style.color.includes('rgb(177, 39, 4)') || // Amazon's price red
                style.color.includes('rgb(0, 118, 0)') || // Amazon's deal green
                style.color.includes('rgb(177, 39, 4)')))) { // Another common price color
            return current;
          }
        }
      } catch (styleError) {
        // Style access failed, which might indicate a restricted context
        // Continue with other approaches
      }
    }
    
    return null; // No container found within maxLevels
  } catch (e) {
    // Handle any unexpected errors
    console.debug('Bitcoin Price Tag: Critical error finding Amazon price container', {
      error: e.message,
    });
    return null;
  }
}

/**
 * Extract Amazon price components from a container element
 * Enhanced with defensive coding, error handling, and context awareness
 * 
 * @param {Element} container - The price container element 
 * @param {Object} [options] - Additional options for processing
 * @param {boolean} [options.isRestrictedContext] - Whether we're in a restricted context
 * @param {boolean} [options.isAmazonRestricted] - Whether we're in a restricted Amazon iframe
 * @returns {Object} Object containing symbol, whole, and fraction parts
 * @throws {Error} If DOM access is restricted
 */
/**
 * Function is necessarily complex due to the variety of price component formats used by Amazon
 * across different pages and regions. The complexity handles numerous edge cases and
 * ensures reliable price extraction in unpredictable DOM structures.
 */
/* eslint-disable complexity */
function extractAmazonPriceComponents(container, options = {}) {
  // Define default components
  const components = {
    symbol: '',
    whole: '',
    fraction: '',
    error: null,
    source: 'unknown', // Tracks how the extraction was done for debugging
  };
  
  // Input validation with defensive coding
  if (!container) {
    components.error = 'null_container';
    return components;
  }
  
  // Early exit in restricted contexts
  if (options.isRestrictedContext || options.isAmazonRestricted) {
    components.error = 'restricted_context';
    components.restrictionReason = options.restrictionReason || 'unknown_restriction';
    return components;
  }
  
  try {
    // First verify DOM access is available
    try {
      // Test DOM access by checking fundamental properties
      if (typeof container.querySelector !== 'function') {
        components.error = 'querySelector_missing';
        return components;
      }
      
      if (typeof container.textContent !== 'string' && 
          container.textContent !== undefined) {
        components.error = 'textContent_invalid';
        return components;
      }
    } catch (domAccessError) {
      // If we can't access these basic properties, this is a restricted context
      components.error = 'dom_access_error';
      components.errorDetails = domAccessError.message;
      throw new Error(`DOM access restricted: ${domAccessError.message}`);
    }
    
    // Step 1: Try structured component extraction first with defensive coding
    let extractedStructured = false;
    try {
      // Use meaningful selectors with broader support for different Amazon layouts
      // Extract the currency symbol
      try {
        const symbolSelectors = [
          '.a-price-symbol', 
          '.sx-price-currency', 
          '[class*="currency"]', 
          '[class*="symbol"]',
          '.a-text-price > :first-child', // Another common pattern
          '.p13n-sc-price > span:first-child', // Recommendation price pattern
        ];
        
        let symbolElement = null;
        // Try each selector until we find a match
        for (const selector of symbolSelectors) {
          try {
            symbolElement = container.querySelector(selector);
            if (symbolElement && symbolElement.textContent) {
              break;
            }
          } catch (selectorError) {
            // Try next selector if this one fails
            continue;
          }
        }
        
        if (symbolElement && symbolElement.textContent) {
          components.symbol = symbolElement.textContent.trim();
          extractedStructured = true;
        }
      } catch (symbolError) {
        console.debug('Bitcoin Price Tag: Error extracting price symbol', symbolError.message);
      }
      
      // Extract the whole number part
      try {
        const wholeSelectors = [
          '.a-price-whole', 
          '.sx-price-whole', 
          '[class*="whole"]',
          '.a-price > .a-price-whole', // More specific Amazon selector
          '.price-large > span:first-of-type', // Another pattern
        ];
        
        let wholeElement = null;
        // Try each selector until we find a match
        for (const selector of wholeSelectors) {
          try {
            wholeElement = container.querySelector(selector);
            if (wholeElement && wholeElement.textContent) {
              break;
            }
          } catch (selectorError) {
            // Try next selector if this one fails
            continue;
          }
        }
        
        if (wholeElement && wholeElement.textContent) {
          components.whole = wholeElement.textContent.trim();
          extractedStructured = true;
        }
      } catch (wholeError) {
        console.debug('Bitcoin Price Tag: Error extracting price whole part', wholeError.message);
      }
      
      // Extract the fraction part
      try {
        const fractionSelectors = [
          '.a-price-fraction', 
          '.sx-price-fractional', 
          '[class*="fraction"]',
          '.a-price > .a-price-fraction', // More specific Amazon selector
          '.price-large > sup', // Superscript fraction
          '.price-large > span:last-of-type', // Another pattern
        ];
        
        let fractionElement = null;
        // Try each selector until we find a match
        for (const selector of fractionSelectors) {
          try {
            fractionElement = container.querySelector(selector);
            if (fractionElement && fractionElement.textContent) {
              break;
            }
          } catch (selectorError) {
            // Try next selector if this one fails
            continue;
          }
        }
        
        if (fractionElement && fractionElement.textContent) {
          components.fraction = fractionElement.textContent.trim();
          extractedStructured = true;
        }
      } catch (fractionError) {
        console.debug('Bitcoin Price Tag: Error extracting price fraction part', fractionError.message);
      }
      
      if (extractedStructured) {
        components.source = 'structured';
      }
    } catch (structuredExtractionError) {
      console.debug('Bitcoin Price Tag: Error in structured price component extraction', {
        error: structuredExtractionError.message,
      });
      // Continue to other extraction methods
    }
    
    // Step 2: If structured extraction failed or was incomplete, try text parsing
    if (!extractedStructured || !components.symbol || !components.whole) {
      try {
        let fullPriceText = '';
        try {
          fullPriceText = container.textContent || '';
          fullPriceText = fullPriceText.trim();
        } catch (textError) {
          components.error = 'text_content_error';
          return components;
        }
        
        if (fullPriceText) {
          // First try to match a classic price pattern
          try {
            // Look for typical price format: $19.99 or $1,299.99
            // This pattern matches:
            // Group 1: Currency symbol or text before numbers ($, €, etc.)
            // Group 2: Whole part with optional commas
            // Group 3: Fraction part (if present)
            const priceMatch = fullPriceText.match(/([^0-9.,]*)(\d[\d,]*)\.?(\d*)/);
            
            if (priceMatch) {
              // Only use these parts if they're not already determined by structured extraction
              if (!components.symbol || components.symbol === '') {
                components.symbol = (priceMatch[1] || '').trim() || '$';
                components.source = components.source === 'structured' ? 'hybrid' : 'regex';
              }
              
              if (!components.whole || components.whole === '') {
                components.whole = (priceMatch[2] || '').trim();
                components.source = components.source === 'structured' ? 'hybrid' : 'regex';
              }
              
              if (!components.fraction || components.fraction === '') {
                components.fraction = (priceMatch[3] || '').trim();
                components.source = components.source === 'structured' ? 'hybrid' : 'regex';
              }
                // components.source = components.source === 'structured' ? 'hybrid' : 'regex';
              
              if (!components.whole || components.whole === '') {
                components.whole = (priceMatch[2] || '').trim();
                components.source = components.source === 'structured' ? 'hybrid' : 'regex';
              }
              
              if (!components.fraction || components.fraction === '') {
                components.fraction = (priceMatch[3] || '').trim();
                components.source = components.source === 'structured' ? 'hybrid' : 'regex';
              }
            }
          } catch (regexError) {
            console.debug('Bitcoin Price Tag: Error in price regex parsing', regexError.message);
          }
          
          // If regex didn't work or was incomplete, try more aggressive parsing
          if (!components.whole || components.whole === '') {
            try {
              // Look for any number with commas and periods in the text
              const numericMatches = fullPriceText.match(/(\d+[,\d]*\.?\d*)/g);
              
              if (numericMatches && numericMatches.length > 0) {
                // Find the most likely price (usually the first or largest number)
                let likelyPrice = numericMatches[0];
                
                // If there are multiple matches, prefer ones with decimal points
                for (const match of numericMatches) {
                  if (match.includes('.')) {
                    likelyPrice = match;
                    break;
                  }
                }
                
                // Split by decimal point if present
                const parts = likelyPrice.split('.');
                components.whole = parts[0] || '';
                components.fraction = parts.length > 1 ? parts[1] : '';
                components.source = components.source === 'structured' ? 'hybrid' : 'fallback';
              }
            } catch (fallbackError) {
              console.debug('Bitcoin Price Tag: Error in aggressive number parsing', fallbackError.message);
            }
          }
          
          // If we still don't have a currency symbol, try to detect it in the text
          if (!components.symbol || components.symbol === '') {
            try {
              // Look for common currency indicators
              if (fullPriceText.includes('$') || /usd|dollar/i.test(fullPriceText)) {
                components.symbol = '$';
              } else if (fullPriceText.includes('€') || /eur|euro/i.test(fullPriceText)) {
                components.symbol = '€';
              } else if (fullPriceText.includes('£') || /gbp|pound/i.test(fullPriceText)) {
                components.symbol = '£';
              } else if (fullPriceText.includes('¥') || /jpy|yen/i.test(fullPriceText)) {
                components.symbol = '¥';
              } else {
                // Default to $ if no currency detected
                components.symbol = '$';
              }
              
              components.source = components.source || 'symbol_detection';
            } catch (symbolDetectionError) {
              // Use a default if symbol detection fails
              components.symbol = '$';
              components.source = 'default_symbol';
            }
          }
        }
      } catch (textParsingError) {
        console.debug('Bitcoin Price Tag: Error in text-based price extraction', {
          error: textParsingError.message,
        });
      }
    }
    
    // Step 3: Clean up and normalize components regardless of extraction method
    try {
      // Clean up the symbol - ensure it's a recognized currency symbol
      components.symbol = cleanupCurrencySymbol(components.symbol);
      
      // Clean up the whole part - ensure it only contains digits and commas
      if (components.whole) {
        components.whole = components.whole.replace(/[^\d,]/g, '');
      }
      
      // Clean up the fraction part - ensure it only contains digits
      if (components.fraction) {
        components.fraction = components.fraction.replace(/\D/g, '');
        
        // If fraction is too long (more than 2 digits), truncate it
        if (components.fraction.length > 2) {
          components.fraction = components.fraction.substring(0, 2);
        }
      }
      
      // If all attempts failed to get a whole part, use a last-ditch effort
      if ((!components.whole || components.whole === '') && components.symbol) {
        try {
          const fullText = container.textContent || '';
          // Look for any number pattern as a desperate attempt
          const anyNumber = fullText.match(/\d+/);
          if (anyNumber) {
            components.whole = anyNumber[0];
            components.source = 'emergency_extraction';
          } else {
            components.whole = '0';
            components.source = 'default_fallback';
            components.error = 'no_numeric_value_found';
          }
        } catch (lastDitchError) {
          // Absolute fallback if everything else fails
          components.whole = '0';
          components.source = 'complete_fallback';
          components.error = 'extraction_failed';
        }
      }
    } catch (cleanupError) {
      console.debug('Bitcoin Price Tag: Error cleaning up price components', cleanupError.message);
    }
  } catch (e) {
    // Handle any unexpected errors in the overall extraction process
    console.debug('Bitcoin Price Tag: Critical error extracting Amazon price components', {
      error: e.message,
    });
    
    components.error = 'critical_extraction_error';
    components.errorDetails = e.message;
    
    // Provide default values to prevent crashes
    components.symbol = components.symbol || '$';
    components.whole = components.whole || '0';
    components.fraction = components.fraction || '00';
    components.source = 'error_fallback';
  }
  
  return components;
}

/**
 * Helper function to clean up and normalize currency symbols
 * @param {string} symbol - The raw symbol text to clean up
 * @returns {string} A normalized currency symbol
 */
function cleanupCurrencySymbol(symbol) {
  if (!symbol || symbol === '') {
    return '$'; // Default to $ if no symbol found
  }
  
  // First attempt - direct match of currency symbols
  if (/^[$€£¥₹]$/.test(symbol)) {
    return symbol; // Already a clean currency symbol
  }
  
  // Second attempt - extract currency symbol if it's embedded in text
  const symbolMatch = symbol.match(/[$€£¥₹]/);
  if (symbolMatch) {
    return symbolMatch[0];
  }
  
  // Third attempt - check for currency words and abbreviations
  const normalizedSymbol = symbol.trim().toLowerCase();
  
  if (normalizedSymbol.includes('$') || normalizedSymbol.includes('usd') || normalizedSymbol.includes('dollar')) {
    return '$';
  } else if (normalizedSymbol.includes('€') || normalizedSymbol.includes('eur') || normalizedSymbol.includes('euro')) {
    return '€';
  } else if (normalizedSymbol.includes('£') || normalizedSymbol.includes('gbp') || normalizedSymbol.includes('pound')) {
    return '£';
  } else if (normalizedSymbol.includes('¥') || normalizedSymbol.includes('jpy') || normalizedSymbol.includes('yen')) {
    return '¥';
  } else if (normalizedSymbol.includes('₹') || normalizedSymbol.includes('inr') || normalizedSymbol.includes('rupee')) {
    return '₹';
  }
  
  // Default fallback
  return '$';
}

/**
 * Check if an element is price-related based on its attributes and content
 * @param {Element} element - The element to check
 * @returns {boolean} True if the element is price-related
 */
function isPriceRelated(element) {
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
 * Check if a node is visible based on its computed style
 * @param {Element} node - The element to check
 * @returns {boolean} Whether the element is visible
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
 * Walk the DOM tree non-recursively
 * Enhanced with context-aware skip logic, error handling, and defensive coding
 * 
 * This function is necessarily complex due to the nature of traversing potentially large DOM trees,
 * needing to handle various edge cases, DOM access limitations, and browser-specific quirks.
 * The complexity ensures resilient operation in unpredictable web environments.
 * 
 * @param {Element} startNode - The node to start walking from
 * @param {number} btcPrice - Bitcoin price
 * @param {number} satPrice - Satoshi price
 * @param {boolean} isTargeted - Whether this is a targeted scan of price elements
 * @param {Object} [options] - Additional options for processing
 * @param {boolean} [options.isRestrictedContext] - Whether we're in a restricted context
 * @param {boolean} [options.isAmazonRestricted] - Whether we're in a restricted Amazon iframe
 * @param {string} [options.restrictionReason] - Reason for restriction if applicable
 * @param {number} [options.maxOperations=10000] - Maximum DOM operations to perform
 * @param {number} [options.maxStackSize=500] - Maximum size of the DOM traversal stack
 * @returns {Object} Processing statistics including nodes processed and reason for early termination
 */
/* eslint-disable complexity */
export function walkDomTree(startNode, btcPrice, satPrice, isTargeted = false, options = {}) {
  // Processing statistics
  const stats = {
    nodesProcessed: 0,
    nodesConverted: 0,
    amazonPricesConverted: 0,
    regularPricesConverted: 0,
    startTime: Date.now(),
    endTime: null,
    completedSuccessfully: false,
    operationsLimit: options.maxOperations || 10000,
    stackSizeLimit: options.maxStackSize || 500,
    error: null,
    skippedDueToRestrictions: false,
    operationsTerminated: false,
    stackSizeTerminated: false,
  };
  
  // Early exit for null node
  if (!startNode) {
    stats.error = 'null_start_node';
    stats.endTime = Date.now();
    return stats;
  }
  
  // Early exit in restricted contexts
  if (options.isRestrictedContext || options.isAmazonRestricted) {
    stats.skippedDueToRestrictions = true;
    stats.restrictionReason = options.restrictionReason || 'unknown_restriction';
    stats.endTime = Date.now();
    return stats;
  }
  
  // Check if processedNodes WeakSet is available and defensively create it if needed
  if (!processedNodes || typeof processedNodes.has !== 'function' || typeof processedNodes.add !== 'function') {
    try {
      processedNodes = new WeakSet();
    } catch (weakSetError) {
      stats.error = 'weakset_initialization_error';
      stats.errorDetails = weakSetError.message;
      stats.endTime = Date.now();
      return stats;
    }
  }
  
  // Skip if we've already processed this node (defensive check)
  try {
    if (processedNodes.has(startNode)) {
      stats.error = 'start_node_already_processed';
      stats.endTime = Date.now();
      return stats;
    }
  } catch (weakSetError) {
    // If WeakSet operations fail, create a new WeakSet and continue
    try {
      processedNodes = new WeakSet();
    } catch (newWeakSetError) {
      stats.error = 'critical_weakset_error';
      stats.errorDetails = newWeakSetError.message;
      stats.endTime = Date.now();
      return stats;
    }
  }
  
  try {
    // Use a stack instead of recursion to avoid call stack issues with large DOM trees
    const stack = [startNode];
    let operationsCount = 0;
    
    while (stack.length > 0) {
      // Check operations limit to prevent excessive processing
      if (operationsCount >= stats.operationsLimit) {
        stats.operationsTerminated = true;
        stats.error = 'operations_limit_reached';
        break;
      }
      
      // Check stack size limit to prevent memory issues
      if (stack.length > stats.stackSizeLimit) {
        stats.stackSizeTerminated = true;
        stats.error = 'stack_size_limit_reached';
        break;
      }
      
      // Process the next node
      const node = stack.pop();
      operationsCount++;
      
      // Skip null or undefined nodes
      if (!node) continue;
      
      // Skip already processed nodes (with defensive error handling)
      try {
        if (processedNodes.has(node)) continue;
        
        // Mark node as processed
        processedNodes.add(node);
      } catch (weakSetError) {
        // On WeakSet error, continue without tracking processed nodes
        console.debug('Bitcoin Price Tag: WeakSet error in walkDomTree', {
          error: weakSetError.message,
        });
        // Don't break the operation, just continue
      }
      
      stats.nodesProcessed++;
      
      // Process based on node type with safety checks
      try {
        if (!node.nodeType) continue; // Skip nodes without a valid nodeType
        
        switch (node.nodeType) {
          case 1: // Element
          case 9: // Document
          case 11: // Document fragment
            {
              // Early check for safe DOM traversal
              if (!node.tagName || !node.lastChild) continue;
              
              // Skip elements that are unlikely to contain prices
              const tagName = node.tagName.toLowerCase();
              if (SKIP_TAGS.has(tagName)) continue;
            }
            
            // Skip invisible elements in targeted mode only (for completeness in full scan)
            if (isTargeted) {
              try {
                if (!isNodeVisible(node)) continue;
              } catch (visibilityError) {
                // If visibility check fails, assume visible to avoid missing prices
              }
            }
            
            // Skip elements without price-related classes in targeted mode
            if (isTargeted) {
              try {
                if (!isPriceRelated(node)) continue;
              } catch (priceRelatedError) {
                // If price-related check fails, continue anyway to avoid missing prices
              }
            }
            
            // Process children in reverse order for stack with safety checks
            try {
              let child = node.lastChild;
              
              while (child) {
                const prev = child.previousSibling;
                
                // Check for Amazon price component format with contextual options
                if (child.nodeType === 1 && child.classList) {
                  try {
                    const result = processAmazonPrice(
                      child, 
                      child.nextSibling, 
                      btcPrice, 
                      satPrice, 
                      {
                        isRestrictedContext: options.isRestrictedContext,
                        isAmazonRestricted: options.isAmazonRestricted,
                      },
                    );
                    
                    if (result.processed) {
                      stats.amazonPricesConverted++;
                      
                      // If we processed an entire container, skip this branch of the tree
                      if (result.processedContainer) {
                        try {
                          // Mark the entire container and its children as processed
                          const container = findAmazonPriceContainer(child, {
                            isRestrictedContext: options.isRestrictedContext,
                            isAmazonRestricted: options.isAmazonRestricted,
                          });
                          
                          if (container) {
                            try {
                              processedNodes.add(container);
                              
                              // Try to mark all children as processed
                              try {
                                const allChildren = container.querySelectorAll('*');
                                if (allChildren) {
                                  for (let i = 0; i < allChildren.length; i++) {
                                    const element = allChildren[i];
                                    if (element) {
                                      processedNodes.add(element);
                                    }
                                  }
                                }
                              } catch (childrenMarkingError) {
                                // Non-critical, just continue if marking children fails
                              }
                            } catch (containerMarkingError) {
                              // Continue if marking container as processed fails
                            }
                          }
                        } catch (containerFindingError) {
                          // Continue if finding container fails
                        }
                        
                        // Skip to the next sibling of the current child
                        child = prev;
                        continue;
                      }
                      
                      // Skip the next node if it was processed as part of this one
                      child = prev;
                      continue;
                    }
                  } catch (amazonProcessingError) {
                    // Continue with normal processing if Amazon price handling fails
                    console.debug('Bitcoin Price Tag: Error processing Amazon price', {
                      error: amazonProcessingError.message,
                    });
                  }
                }
                
                // Push child to stack with safety handling
                try {
                  stack.push(child);
                } catch (stackPushError) {
                  console.debug('Bitcoin Price Tag: Error pushing to stack', {
                    error: stackPushError.message,
                  });
                  // This is non-critical, just continue
                }
                
                // Move to previous sibling with safety check
                child = prev;
              }
            } catch (childTraversalError) {
              console.debug('Bitcoin Price Tag: Error traversing children', {
                error: childTraversalError.message,
              });
              // Continue with next stack item if child traversal fails
            }
            break;
            
          case 3: // Text node
            // Safe check for text node content
            if (!node.nodeValue || node.nodeValue.trim() === '') {
              continue;
            }
            
            // Process text node with safe conversion
            try {
              const converted = convertPriceText(node, btcPrice, satPrice);
              if (converted) {
                stats.regularPricesConverted++;
              }
            } catch (conversionError) {
              console.debug('Bitcoin Price Tag: Error converting price text', {
                error: conversionError.message,
              });
              // Non-critical, continue with other nodes
            }
            break;
            
          default:
            // Skip other node types
            continue;
        }
      } catch (nodeProcessingError) {
        console.debug('Bitcoin Price Tag: Error processing node', {
          nodeType: node.nodeType,
          error: nodeProcessingError.message,
        });
        // Continue with next node if processing fails
      }
    }
    
    // Mark completion status
    stats.completedSuccessfully = !stats.operationsTerminated && 
                                !stats.stackSizeTerminated && 
                                !stats.error;
    
    // Calculate conversion statistics
    stats.totalConversions = stats.amazonPricesConverted + stats.regularPricesConverted;
    
    // Record end time
    stats.endTime = Date.now();
    stats.duration = stats.endTime - stats.startTime;
    
    // Log processing statistics for large operations
    if (stats.nodesProcessed > 1000 || stats.duration > 500) {
      console.debug('Bitcoin Price Tag: DOM tree walking statistics', {
        nodesProcessed: stats.nodesProcessed,
        conversions: stats.totalConversions,
        duration: stats.duration + 'ms',
        completed: stats.completedSuccessfully,
      });
    }
    
    return stats;
  } catch (e) {
    // Handle any unexpected errors in the overall process
    stats.error = 'critical_error';
    stats.errorDetails = e.message;
    stats.endTime = Date.now();
    stats.duration = stats.endTime - stats.startTime;
    
    console.debug('Bitcoin Price Tag: Critical error in walkDomTree', {
      error: e.message,
      stack: e.stack,
      duration: stats.duration + 'ms',
    });
    
    return stats;
  }
}

/**
 * Optimized scanning of DOM for price conversions
 * Enhanced with context-aware skip logic, error handling, and defensive coding
 * 
 * @param {Document|Element} root - The root element to scan
 * @param {number} btcPrice - Bitcoin price
 * @param {number} satPrice - Satoshi price
 * @param {Object} [options] - Additional options for processing
 * @param {boolean} [options.isRestrictedContext] - Whether we're in a restricted context
 * @param {boolean} [options.isAmazonRestricted] - Whether we're in a restricted Amazon iframe
 * @param {string} [options.restrictionReason] - Reason for restriction if applicable
 * @param {boolean} [options.skipTargetedScan] - Skip the targeted scan phase for speed
 * @param {boolean} [options.skipCompleteScan] - Skip the complete scan phase for performance
 * @param {number} [options.maxOperations=15000] - Maximum DOM operations to perform
 * @returns {Object} Processing statistics including nodes processed and scan results
 */
export function scanDomForPrices(root, btcPrice, satPrice, options = {}) {
  // Processing statistics
  const stats = {
    startTime: Date.now(),
    endTime: null,
    targetedScanStats: null,
    completeScanStats: null,
    totalNodesProcessed: 0,
    totalConversions: 0,
    completedSuccessfully: false,
    skippedDueToRestrictions: false,
    skippedTargetedScan: false,
    skippedCompleteScan: false,
    error: null,
    priceElements: 0,
  };
  
  // Early validation of inputs
  if (!root) {
    stats.error = 'null_root';
    stats.endTime = Date.now();
    return stats;
  }
  
  // Early validation of price data
  if (!btcPrice || isNaN(btcPrice) || btcPrice <= 0) {
    stats.error = 'invalid_btc_price';
    stats.endTime = Date.now();
    return stats;
  }
  
  if (!satPrice || isNaN(satPrice) || satPrice <= 0) {
    stats.error = 'invalid_sat_price';
    stats.endTime = Date.now();
    return stats;
  }
  
  // Early exit in restricted contexts
  if (options.isRestrictedContext || options.isAmazonRestricted) {
    stats.skippedDueToRestrictions = true;
    stats.restrictionReason = options.restrictionReason || 'unknown_restriction';
    stats.endTime = Date.now();
    return stats;
  }
  
  try {
    // Phase 1: Targeted scan of likely price elements (faster, more efficient)
    if (!options.skipTargetedScan) {
      try {
        // Find price-related elements with defensive error handling
        let priceElements = [];
        
        try {
          priceElements = findPriceElements(root);
          stats.priceElements = priceElements.length;
        } catch (findError) {
          console.debug('Bitcoin Price Tag: Error finding price elements', {
            error: findError.message,
          });
          // Continue with an empty array if findPriceElements fails
          priceElements = [];
          stats.error = 'price_elements_error';
        }
        
        // Process each price element with a targeted scan
        const targetedResults = [];
        for (const element of priceElements) {
          try {
            if (!element) continue; // Skip null elements
            
            // Set a lower operation limit for each individual element
            const elementOptions = {
              ...options,
              maxOperations: Math.min(options.maxOperations || 1000, 1000),
              maxStackSize: 100, // Lower stack size for targeted scans
            };
            
            // Run the targeted scan (isTargeted = true)
            const elementStats = walkDomTree(element, btcPrice, satPrice, true, elementOptions);
            targetedResults.push(elementStats);
          } catch (elementError) {
            console.debug('Bitcoin Price Tag: Error processing price element', {
              error: elementError.message,
            });
            // Continue with next element if one fails
          }
        }
        
        // Aggregate results from all targeted scans
        stats.targetedScanStats = {
          elementsScanned: targetedResults.length,
          nodesProcessed: targetedResults.reduce((sum, res) => sum + (res.nodesProcessed || 0), 0),
          conversions: targetedResults.reduce((sum, res) => sum + (res.totalConversions || 0), 0),
          amazonPricesConverted: targetedResults.reduce((sum, res) => sum + (res.amazonPricesConverted || 0), 0),
          regularPricesConverted: targetedResults.reduce((sum, res) => sum + (res.regularPricesConverted || 0), 0),
          operationsTerminated: targetedResults.some(res => res.operationsTerminated),
          errors: targetedResults.filter(res => res.error).map(res => res.error),
        };
        
        // Update total statistics
        stats.totalNodesProcessed += stats.targetedScanStats.nodesProcessed;
        stats.totalConversions += stats.targetedScanStats.conversions;
      } catch (targetedScanError) {
        console.debug('Bitcoin Price Tag: Error in targeted scan phase', {
          error: targetedScanError.message,
        });
        stats.targetedScanStats = { error: targetedScanError.message };
      }
    } else {
      stats.skippedTargetedScan = true;
    }
    
    // Phase 2: Complete scan of the DOM to catch any missed prices
    // This is more thorough but less efficient, so make it optional
    if (!options.skipCompleteScan) {
      try {
        // Calculate remaining operations budget
        const usedOperations = stats.targetedScanStats?.nodesProcessed || 0;
        const maxOperations = options.maxOperations || 15000;
        const remainingOperations = Math.max(maxOperations - usedOperations, 5000);
        
        // Set options for complete scan
        const completeOptions = {
          ...options,
          maxOperations: remainingOperations,
          maxStackSize: 200, // Higher stack size for complete scan
        };
        
        // Run the complete scan (isTargeted = false)
        const completeStats = walkDomTree(root, btcPrice, satPrice, false, completeOptions);
        stats.completeScanStats = completeStats;
        
        // Update total statistics
        stats.totalNodesProcessed += completeStats.nodesProcessed;
        stats.totalConversions += completeStats.totalConversions;
      } catch (completeScanError) {
        console.debug('Bitcoin Price Tag: Error in complete scan phase', {
          error: completeScanError.message,
        });
        stats.completeScanStats = { error: completeScanError.message };
      }
    } else {
      stats.skippedCompleteScan = true;
    }
    
    // Mark as successful if at least one scan phase completed without critical errors
    stats.completedSuccessfully = (
      (stats.targetedScanStats && !stats.targetedScanStats.error) ||
      (stats.completeScanStats && !stats.completeScanStats.error)
    );
    
    // Record end time and duration
    stats.endTime = Date.now();
    stats.duration = stats.endTime - stats.startTime;
    
    // Log scan statistics
    if (stats.totalNodesProcessed > 1000 || stats.duration > 1000) {
      console.debug('Bitcoin Price Tag: DOM scanning statistics', {
        totalNodes: stats.totalNodesProcessed,
        conversions: stats.totalConversions,
        duration: stats.duration + 'ms',
        targeted: !stats.skippedTargetedScan,
        complete: !stats.skippedCompleteScan,
        successful: stats.completedSuccessfully,
      });
    }
    
    return stats;
  } catch (e) {
    // Handle any unexpected errors in the overall scanning process
    stats.error = 'critical_scanning_error';
    stats.errorDetails = e.message;
    stats.endTime = Date.now();
    stats.duration = stats.endTime - stats.startTime;
    
    console.debug('Bitcoin Price Tag: Critical error in scanDomForPrices', {
      error: e.message,
      stack: e.stack,
      duration: stats.duration + 'ms',
    });
    
    return stats;
  }
}

/**
 * Check if we're in a cross-origin iframe where DOM access may be restricted
 * Enhanced with more comprehensive checks and safety protections
 * @returns {Object} Details about the restricted status
 */
export function isInRestrictedIframe() {
  const result = {
    restricted: false,
    reason: null,
    details: {},
    severity: 'none',  // none, low, medium, high - indicating how restrictive the environment is
    restrictionChecks: [],  // track which checks failed
  };
  
  try {
    // Check if we're in an iframe at all - this is the most basic check
    result.details.isIframe = window !== window.top;
    if (!result.details.isIframe) {
      return result; // Not an iframe, so not restricted
    }
    
    result.details.url = window.location.href || '';
    result.details.hostname = window.location.hostname || '';
    
    // Check if the URL contains indicators of a restricted context
    const restrictedUrlIndicators = [
      'ad-iframe', 'ad_iframe', 'adframe', 'ad/frame', 
      'sandbox', 'popover', 'popup', 'modal', 'overlay',
      'embed', '/embed/', 'iframe', 'banner', 'creative',
      'widget', 'gadget', 'promotion', 'sponsor',
    ];
    
    const hasRestrictedUrlIndicator = restrictedUrlIndicators.some(indicator => 
      result.details.url.toLowerCase().includes(indicator.toLowerCase()),
    );
    
    if (hasRestrictedUrlIndicator) {
      result.restrictionChecks.push('url_indicators');
      result.details.hasRestrictedUrlIndicator = true;
      result.severity = Math.max(result.severity === 'none' ? 0 : 1, 1); // Set to at least 'low'
    }
    
    // Check if window has a frameElement (not accessible in cross-origin iframes)
    try {
      result.details.hasFrameElement = !!window.frameElement;
    } catch (frameError) {
      result.details.hasFrameElement = false;
      result.details.frameElementError = frameError.message;
      result.restrictionChecks.push('frame_element_access');
      result.severity = Math.max(result.severity === 'none' ? 0 : 2, 2); // Set to at least 'medium'
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
        result.restrictionChecks.push('different_origin');
        result.severity = Math.max(result.severity === 'none' ? 0 : 2, 2); // Set to at least 'medium'
      }
    } catch (originError) {
      result.restricted = true;
      result.reason = 'cross_origin_exception';
      result.details.originAccessError = originError.message;
      result.restrictionChecks.push('parent_origin_access');
      result.severity = Math.max(result.severity === 'none' ? 0 : 3, 3); // Set to 'high'
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
        const allowForms = sandboxValue.includes('allow-forms');
        const allowPopups = sandboxValue.includes('allow-popups');
        
        result.details.allowScripts = allowScripts;
        result.details.allowSameOrigin = allowSameOrigin;
        result.details.allowForms = allowForms;
        result.details.allowPopups = allowPopups;
        
        // Track which specific sandbox restrictions are in place
        const sandboxRestrictions = [];
        
        if (!allowScripts) {
          sandboxRestrictions.push('no_scripts');
          result.severity = Math.max(result.severity === 'none' ? 0 : 3, 3); // Set to 'high'
        }
        
        if (!allowSameOrigin) {
          sandboxRestrictions.push('no_same_origin');
          result.severity = Math.max(result.severity === 'none' ? 0 : 3, 3); // Set to 'high'
        }
        
        if (!allowForms || !allowPopups) {
          sandboxRestrictions.push('limited_functionality');
          result.severity = Math.max(result.severity === 'none' ? 0 : 2, 2); // Set to at least 'medium'
        }
        
        if (sandboxRestrictions.length > 0) {
          result.restricted = true;
          result.reason = result.reason || 'sandbox_restrictions';
          result.details.sandboxRestrictions = sandboxRestrictions;
          result.restrictionChecks.push('sandbox_attribute');
        }
      }
    } catch (sandboxError) {
      // If we can't access frameElement, this will error which is already handled above
      result.details.sandboxCheckError = sandboxError.message;
    }
    
    // Check iframe dimensions - tiny iframes are often for ads or tracking
    try {
      const tinyThreshold = 10; // pixels
      const smallThreshold = 200; // pixels
      
      const width = window.innerWidth || document.documentElement.clientWidth || 0;
      const height = window.innerHeight || document.documentElement.clientHeight || 0;
      
      result.details.dimensions = { width, height };
      
      if (width <= tinyThreshold || height <= tinyThreshold) {
        result.restricted = true;
        result.reason = result.reason || 'tiny_iframe';
        result.restrictionChecks.push('tiny_dimensions');
        result.severity = Math.max(result.severity === 'none' ? 0 : 3, 3); // Set to 'high'
      } else if (width <= smallThreshold || height <= smallThreshold) {
        result.details.isSmallFrame = true;
        result.restrictionChecks.push('small_dimensions');
        result.severity = Math.max(result.severity === 'none' ? 0 : 1, 1); // Set to at least 'low'
      }
    } catch (dimensionError) {
      result.details.dimensionCheckError = dimensionError.message;
    }
    
    // Check for CSP headers that might restrict script execution
    try {
      // Check for CSP headers indirectly via meta tags
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (cspMeta) {
        const cspContent = cspMeta.getAttribute('content');
        result.details.hasCSPMeta = true;
        result.details.cspContent = cspContent;
        
        // Parse and analyze CSP directives
        const cspRestrictions = [];
        
        // Check script-src restrictions
        if (cspContent && cspContent.includes('script-src')) {
          if (!cspContent.includes('unsafe-inline')) {
            cspRestrictions.push('no_inline_scripts');
          }
          
          if (!cspContent.includes('unsafe-eval')) {
            cspRestrictions.push('no_eval');
          }
          
          // Very restrictive if only allows specific origins
          const hasWildcard = cspContent.includes('script-src *') || 
                             cspContent.includes("script-src 'self'");
          
          if (!hasWildcard) {
            cspRestrictions.push('limited_script_sources');
          }
        }
        
        // Check connect-src restrictions
        if (cspContent && cspContent.includes('connect-src') && 
            !cspContent.includes('connect-src *')) {
          cspRestrictions.push('limited_connections');
        }
        
        if (cspRestrictions.length > 0) {
          result.restricted = true;
          result.reason = result.reason || 'csp_restrictions';
          result.details.cspRestrictions = cspRestrictions;
          result.restrictionChecks.push('content_security_policy');
          result.severity = Math.max(result.severity === 'none' ? 0 : 2, 2); // Set to at least 'medium'
        }
      }
      
      // Try additional CSP detection through feature testing
      try {
        // Check if we can create and execute a script element
        const canCreateScripts = (() => {
          try {
            const script = document.createElement('script');
            script.textContent = '/* Test */';
            document.head.appendChild(script);
            document.head.removeChild(script);
            return true;
          } catch (scriptError) {
            return false;
          }
        })();
        
        result.details.canCreateScripts = canCreateScripts;
        
        if (!canCreateScripts) {
          result.restricted = true;
          result.reason = result.reason || 'script_creation_blocked';
          result.restrictionChecks.push('script_creation');
          result.severity = Math.max(result.severity === 'none' ? 0 : 3, 3); // Set to 'high'
        }
      } catch (scriptTestError) {
        // Script test itself failed, which suggests restrictions
        result.details.scriptTestError = scriptTestError.message;
      }
    } catch (cspError) {
      // CSP check failed, which might indicate restrictions
      result.restricted = true;
      result.reason = result.reason || 'csp_exception';
      result.details.cspCheckError = cspError.message;
      result.restrictionChecks.push('csp_check_error');
      result.severity = Math.max(result.severity === 'none' ? 0 : 2, 2); // Set to at least 'medium'
    }
    
    // Check for access to browser APIs that might be restricted
    try {
      // Check localStorage access
      let hasLocalStorage = false;
      try {
        hasLocalStorage = !!window.localStorage;
        if (hasLocalStorage) {
          // Actually try to use it to verify
          window.localStorage.setItem('btc_test', 'test');
          window.localStorage.removeItem('btc_test');
        }
      } catch (localStorageError) {
        hasLocalStorage = false;
        result.details.localStorageError = localStorageError.message;
        result.restrictionChecks.push('local_storage_access');
      }
      
      // Check sessionStorage access
      let hasSessionStorage = false;
      try {
        hasSessionStorage = !!window.sessionStorage;
        if (hasSessionStorage) {
          // Actually try to use it to verify
          window.sessionStorage.setItem('btc_test', 'test');
          window.sessionStorage.removeItem('btc_test');
        }
      } catch (sessionStorageError) {
        hasSessionStorage = false;
        result.details.sessionStorageError = sessionStorageError.message;
        result.restrictionChecks.push('session_storage_access');
      }
      
      result.details.storage = {
        localStorage: hasLocalStorage,
        sessionStorage: hasSessionStorage,
      };
      
      // If both storage types are blocked, that's a strong indicator of restrictions
      if (!hasLocalStorage && !hasSessionStorage) {
        result.restricted = true;
        result.reason = result.reason || 'storage_access_denied';
        result.severity = Math.max(result.severity === 'none' ? 0 : 2, 2); // Set to at least 'medium'
      }
      
      // Check extension API access if it might be available
      if (typeof chrome !== 'undefined') {
        let hasExtensionAccess = false;
        try {
          hasExtensionAccess = typeof chrome.runtime !== 'undefined' && 
                               typeof chrome.runtime.sendMessage === 'function';
          
          // Try to actually use it
          if (hasExtensionAccess) {
            const extensionId = chrome.runtime.id; // This will throw in restricted contexts
            const _extensionUrl = chrome.runtime.getURL(''); // This will also throw in some cases
            result.details.extensionId = extensionId;
          }
        } catch (extensionError) {
          hasExtensionAccess = false;
          result.details.extensionAccessError = extensionError.message;
          result.restrictionChecks.push('extension_api_access');
        }
        
        result.details.extensionAccess = hasExtensionAccess;
        
        if (!hasExtensionAccess && typeof chrome !== 'undefined') {
          // Chrome object exists but APIs are restricted
          result.restricted = true;
          result.reason = result.reason || 'extension_api_blocked';
          result.severity = Math.max(result.severity === 'none' ? 0 : 3, 3); // Set to 'high'
        }
      }
    } catch (apiAccessError) {
      result.details.apiAccessCheckError = apiAccessError.message;
    }
    
    // Convert numeric severity back to string representation
    switch (result.severity) {
      case 0:
        result.severity = 'none';
        break;
      case 1:
        result.severity = 'low';
        break;
      case 2:
        result.severity = 'medium';
        break;
      case 3:
        result.severity = 'high';
        break;
      default:
        result.severity = 'unknown';
    }
    
    // If we've accumulated restriction checks but haven't explicitly set restricted status,
    // set it based on severity
    if (!result.restricted && result.restrictionChecks.length > 0) {
      if (result.severity === 'medium' || result.severity === 'high') {
        result.restricted = true;
        result.reason = result.reason || `multiple_indicators_${result.severity}_severity`;
      }
    }
    
    // If we're restricted, log the details at debug level
    if (result.restricted) {
      console.debug('Bitcoin Price Tag: Detected restricted iframe', {
        reason: result.reason,
        severity: result.severity,
        checks: result.restrictionChecks,
        details: result.details,
      });
    }
    
    return result;
  } catch (e) {
    // If an unexpected error occurs in our detection logic, consider it restricted
    console.warn('Bitcoin Price Tag: Error detecting iframe restrictions, assuming restricted', e.message);
    return {
      restricted: true,
      reason: 'detection_error',
      severity: 'high',
      details: { detectionError: e.message },
    };
  }
}

/**
 * Check if current page is in an Amazon iframe with typical restrictions
 * Enhanced with more comprehensive context detection and safety measures
 * @returns {Object} Details about the Amazon frame
 */
export function isAmazonRestrictedIframe() {
  const result = {
    isAmazon: false,
    restricted: false,
    reason: null,
    details: {},
    severity: 'none',  // none, low, medium, high
    restrictionChecks: [],  // track which checks failed
  };
  
  try {
    // First check if we're in an iframe at all - fundamental requirement
    const isIframe = window !== window.top;
    result.details.isIframe = isIframe;
    
    if (!isIframe) {
      // Not in an iframe, so not an Amazon iframe
      return result;
    }
    
    // Get URL and hostname with proper defensive coding
    let hostname = '';
    let url = '';
    
    try {
      hostname = window.location.hostname || '';
      url = window.location.href || '';
    } catch (locationError) {
      // If we can't access location, that's a sign of restrictions
      result.details.locationAccessError = locationError.message;
      result.restrictionChecks.push('location_access');
      // Set to medium severity - might be Amazon but we can't tell
      result.severity = 'medium';
    }
    
    result.details.hostname = hostname;
    result.details.url = url;
    
    // More comprehensive Amazon domain list
    const amazonDomains = [
      // Main Amazon domains
      'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 
      'amazon.it', 'amazon.es', 'amazon.ca', 'amazon.in', 
      'amazon.co.jp', 'amazon.jp', 'amazon.cn', 'amazon.com.mx', 
      'amazon.com.br', 'amazon.com.au', 'amazon.nl', 'amazon.sg',
      'amazon.ae', 'amazon.sa', 'amazon.se', 'amazon.pl', 'amazon.tr',
      
      // Amazon subdomains and related domains
      'amzn.', 'amzn-', 'a2z', 'aws.amazon', 'cloudfront.net', 
      'amazonwebservices', 'amazon-adsystem', 'amazon-corp', 
      'amazonservices.', 'aboutamazon.', 'images-amazon', 
      'media-amazon', 'ssl-images-amazon', 'kindle.com',
      
      // Amazon ad system domains
      'advertising-api.amazon', 'assoc-amazon', 'associates-amazon',
      'aax.', 'aax-us', 'amazon-adsystem', 'ad.amazon', 'ads.amazon',
    ];
    
    // Check if we're on an Amazon domain
    const isAmazonDomain = amazonDomains.some(domain => hostname.includes(domain));
    result.details.isAmazonDomain = isAmazonDomain;
    
    // Enhanced list of Amazon-specific URL patterns to identify Amazon content
    const amazonUrlPatterns = [
      // Product pages
      '/gp/product/', '/dp/', '/gp/aw/d/', '/exec/obidos/asin/', 
      
      // Amazon identifiers
      '/Amazon', '/amazon', '/AMAZON', '/amzn', '/Amzn', '/AMZN',
      'ASIN=', 'asin=', 'AmazonID=', 'amazon_id=',
      
      // Amazon services and features
      '/gp/cart/', '/gp/registry/', '/gp/customer/', '/gp/buy/', 
      '/gp/offer-listing/', '/gp/help/', '/gp/your-account/',
      
      // Amazon advertising and widget patterns
      'advertising', 'adsystem', 'adserver', '/ads/', 
      'associates', 'affiliate', 'recommendations', '/rec/',
      'widget', 'deals', 'promotions', '/promo/',
    ];
    
    // Check URL patterns to identify Amazon content even if not on an Amazon domain
    const hasAmazonUrlPattern = amazonUrlPatterns.some(pattern => 
      url.includes(pattern),
    );
    result.details.hasAmazonUrlPattern = hasAmazonUrlPattern;
    
    // Determine if this is likely Amazon content
    result.isAmazon = isAmazonDomain || hasAmazonUrlPattern;
    
    // If not identified as Amazon via domain or URL, check for Amazon-specific DOM patterns
    if (!result.isAmazon) {
      try {
        // Check for common Amazon CSS classes and DOM structures
        const amazonSpecificClasses = [
          'a-container', 'a-box', 'a-section', 'a-spacing', 
          'a-price', 'a-color-price', 'a-size-', 'a-link-', 
          'amzn-', 'aok-', 'puis-', 'apb-', 'aui-', 
          'amazon-', 'amzn-', 'kindle-',
        ];
        
        // Check if document has typical Amazon classes
        let hasAmazonClass = false;
        if (document && document.body) {
          // Check body classes first (faster)
          if (document.body.classList) {
            const bodyClasses = Array.from(document.body.classList);
            hasAmazonClass = amazonSpecificClasses.some(amazonClass => 
              bodyClasses.some(bodyClass => bodyClass.includes(amazonClass)),
            );
          }
          
          // If not found in body, check for specific elements
          if (!hasAmazonClass) {
            const hasAmazonElements = amazonSpecificClasses.some(amazonClass => 
              !!document.querySelector(`.${amazonClass}`) || 
              !!document.querySelector(`[class*="${amazonClass}"]`),
            );
            
            hasAmazonClass = hasAmazonElements;
          }
        }
        
        // Check for Amazon-specific meta tags
        const hasAmazonMeta = document.querySelector('meta[name="keywords"][content*="Amazon"]') !== null || 
                            document.querySelector('meta[name="description"][content*="Amazon"]') !== null;
        
        // If we have strong DOM indicators, mark as Amazon
        if (hasAmazonClass || hasAmazonMeta) {
          result.isAmazon = true;
          result.details.hasAmazonDOMIndicators = true;
        }
      } catch (domCheckError) {
        // DOM check failed, but don't change isAmazon status based on this
        result.details.domCheckError = domCheckError.message;
      }
    }
    
    // Only continue with restriction checks if we've identified this as an Amazon iframe
    if (result.isAmazon && result.details.isIframe) {
      // Evaluate additional factors for restriction determination
      
      // Enhanced list of restricted URL patterns for Amazon frames
      const restrictedUrlPatterns = [
        // Ad-related patterns
        'ad-iframe', 'ad_iframe', 'adframe', 'ad/frame', 'adunit',
        'adSystem', 'adsystem', 'adserver', 'advertising', 'banner',
        'creatives', 'display-ad', 'sponsored', 'promotions',
        
        // Widget and embed patterns
        'widget', 'embed', 'iframe', 'recommendations', '/recs/', 
        
        // UI component patterns that are often restricted
        'sandbox', 'popover', 'popup', 'modal', 'overlay', 'lightbox',
        'drawer', 'tooltip', 'flyout', 'dropdown', 'float',
      ];
      
      // Check URL for restricted patterns
      const hasRestrictedUrlPattern = restrictedUrlPatterns.some(pattern => 
        url.toLowerCase().includes(pattern.toLowerCase()),
      );
      result.details.hasRestrictedUrlPattern = hasRestrictedUrlPattern;
      
      if (hasRestrictedUrlPattern) {
        result.restricted = true;
        result.reason = 'amazon_restricted_url';
        result.restrictionChecks.push('url_patterns');
        result.severity = result.severity === 'none' ? 'medium' : result.severity;
      }
      
      // Check for Amazon-specific DOM elements that indicate a restricted context
      try {
        // Only proceed with DOM checks if the document and body are accessible
        if (document && document.body) {
          // Check body classes for known restricted context indicators
          const restrictedClasses = [
            // Popover/modal related classes
            'ap_popover_content', 'a-popover-content', 'a-popover-wrapper', 
            'a-modal', 'a-popover', 'a-modal-scroller', 'a-sheet-content',
            
            // Overlay and layer related classes
            'a-overlay', 'aok-overlay', 'a-layer', 'a-sheet', 
            'a-popover-modal', 'a-popover-modal-fixed-height',
            
            // Ad and promotion related classes
            'ad-container', 'ad-wrapper', 'apstageslot', 'AdHolder',
            'promotion-content', 'sponsored-products', 'ad-feedback',
            
            // Widget and iframe related classes
            'iframe-wrapper', 'iframe-content', 'embed-content',
            'widget-wrapper', 'widget-content', 'amazon-widget',
          ];
          
          // Check if body has any of these classes
          let hasRestrictedBodyClass = false;
          if (document.body.classList) {
            const bodyClasses = Array.from(document.body.classList);
            hasRestrictedBodyClass = restrictedClasses.some(restrictedClass => 
              bodyClasses.some(bodyClass => bodyClass.includes(restrictedClass)),
            );
          }
          result.details.hasRestrictedBodyClass = hasRestrictedBodyClass;
          
          // Check specifically for popover, overlay, and modal classes (more focused checks)
          result.details.hasPopoverClass = document.body.classList && 
                                          (document.body.classList.contains('ap_popover_content') || 
                                           document.body.classList.contains('a-popover') ||
                                           document.body.classList.contains('a-popover-content'));
          
          result.details.hasOverlayClass = document.body.classList && 
                                          (document.body.classList.contains('a-overlay') || 
                                           document.body.classList.contains('aok-overlay') ||
                                           document.body.classList.contains('a-sheet'));
          
          result.details.hasModalClass = document.body.classList && 
                                        (document.body.classList.contains('a-modal') || 
                                         document.body.classList.contains('a-popover-modal'));
          
          // Enhanced check for ad-related elements with a more comprehensive selector
          result.details.hasAdClass = !!document.querySelector(
            '[id*="ad-"], [class*="ad-"], [id*="ads"], [class*="ads"], ' +
            '[id*="Ad"], [class*="Ad"], [id*="banner"], [class*="banner"], ' +
            '[id*="sponsored"], [class*="sponsored"], [data-ad], ' +
            '[data-creative], [data-ad-unit], [id*="adsystem"], [class*="adsystem"]',
          );
          
          // Check for presence of ad-specific elements common in Amazon ads
          result.details.hasAdElements = !!document.querySelector(
            '[data-aax_size], [data-aax_pubname], [data-aax_src], ' +
            'iframe[src*="amazon-adsystem"], iframe[src*="doubleclick"], ' +
            'iframe[src*="advertising"], [data-aps-slot], [data-ad-format]',
          );
          
          // If any of these DOM checks indicate a restricted context, mark accordingly
          if (result.details.hasPopoverClass || 
              result.details.hasOverlayClass || 
              result.details.hasModalClass ||
              result.details.hasAdClass ||
              result.details.hasAdElements ||
              hasRestrictedBodyClass) {
            result.restricted = true;
            result.reason = result.reason || 'amazon_restricted_content';
            result.restrictionChecks.push('dom_indicators');
            result.severity = Math.max(result.severity === 'none' ? 1 : 2, 
                                     result.severity === 'low' ? 1 : 
                                     result.severity === 'medium' ? 2 : 3);
          }
        }
      } catch (domError) {
        // Error accessing DOM information suggests restrictions
        result.restricted = true;
        result.reason = result.reason || 'amazon_dom_error';
        result.details.domError = domError.message;
        result.restrictionChecks.push('dom_access_error');
        result.severity = 'high'; // DOM errors suggest high restriction
      }
      
      // Check iframe size with more precise handling and thresholds
      try {
        const tinyThreshold = 10; // pixels - likely tracking pixel
        const verySmallThreshold = 100; // pixels - likely small ad unit
        const smallThreshold = 300; // pixels - typical ad unit
        const adThreshold = 600; // pixels - larger ad unit but still restricted
        
        // Get dimensions with fallbacks and default to 0
        const width = window.innerWidth || document.documentElement.clientWidth || 0;
        const height = window.innerHeight || document.documentElement.clientHeight || 0;
        
        result.details.frameWidth = width;
        result.details.frameHeight = height;
        
        // Categorize based on size
        if (width <= tinyThreshold || height <= tinyThreshold) {
          result.details.isTinyFrame = true;
          result.restricted = true;
          result.reason = result.reason || 'amazon_tiny_frame';
          result.restrictionChecks.push('tiny_frame');
          result.severity = 'high'; // Tiny frames are almost certainly restricted
        } else if (width <= verySmallThreshold || height <= verySmallThreshold) {
          result.details.isVerySmallFrame = true;
          result.restricted = true;
          result.reason = result.reason || 'amazon_very_small_frame';
          result.restrictionChecks.push('very_small_frame');
          result.severity = result.severity === 'high' ? 'high' : 'medium';
        } else if (width <= smallThreshold || height <= smallThreshold) {
          result.details.isSmallFrame = true;
          result.restricted = true;
          result.reason = result.reason || 'amazon_small_frame';
          result.restrictionChecks.push('small_frame');
          result.severity = result.severity === 'high' ? 'high' : 
                          result.severity === 'medium' ? 'medium' : 'low';
        } else if (width <= adThreshold || height <= adThreshold) {
          result.details.isLikelyAdFrame = true;
          // Don't automatically restrict just based on this size
          // but record it as a check
          result.restrictionChecks.push('medium_frame');
          result.severity = result.severity === 'none' ? 'low' : result.severity;
        }
      } catch (sizeError) {
        // Error accessing size information suggests restrictions
        result.details.sizeCheckError = sizeError.message;
        result.restrictionChecks.push('size_check_error');
      }
      
      // Check if we can access elements that would indicate we're in a product page vs. ad context
      try {
        // Check for typical Amazon product page elements
        const hasProductElements = !!document.querySelector(
          '#productTitle, #title, #price, #priceblock_ourprice, #buybox, ' +
          '#addToCart, #submit.add-to-cart, #searchDropdownBox, #nav-search, ' +
          '#twister, #variation_color, #variation_size, #prodDetails',
        );
        
        result.details.hasProductElements = hasProductElements;
        
        // If we're definitely on a product page, less likely to be restricted
        if (hasProductElements) {
          // Product pages are usually not restricted - this is a counter-indicator
          result.details.likelyProductPage = true;
          
          // If nothing else has marked this as restricted, leave unrestricted
          if (!result.restricted) {
            result.details.counterIndicatorFound = 'product_page_elements';
          }
        }
      } catch (productCheckError) {
        // Error running product check suggests restrictions
        result.details.productCheckError = productCheckError.message;
      }
      
      // If it's an Amazon iframe and we don't have explicit restriction indicators,
      // check for general iframe restrictions
      if (!result.restricted || result.restrictionChecks.length === 0) {
        const generalRestrictions = isInRestrictedIframe();
        result.details.generalRestrictions = {
          restricted: generalRestrictions.restricted,
          reason: generalRestrictions.reason,
          severity: generalRestrictions.severity,
        };
        
        if (generalRestrictions.restricted) {
          result.restricted = true;
          result.reason = result.reason || 'amazon_general_restrictions';
          result.restrictionChecks.push('general_iframe_restrictions');
          
          // Adopt the severity from general restrictions if higher
          const generalSeverity = generalRestrictions.severity;
          if ((generalSeverity === 'high' && result.severity !== 'high') ||
              (generalSeverity === 'medium' && 
              (result.severity === 'low' || result.severity === 'none'))) {
            result.severity = generalSeverity;
          }
        }
      }
      
      // Convert restriction checks counter to risk categories
      if (result.restrictionChecks.length >= 3) {
        // Multiple indicators suggest high probability of restrictions
        if (!result.restricted) {
          result.restricted = true;
          result.reason = result.reason || 'amazon_multiple_indicators';
        }
        
        // Increase severity based on number of indicators
        if (result.restrictionChecks.length >= 5 && result.severity !== 'high') {
          result.severity = 'high';
        } else if (result.restrictionChecks.length >= 3 && 
                 (result.severity === 'none' || result.severity === 'low')) {
          result.severity = 'medium';
        }
      }
      
      // Final safety check - if in iframe, on Amazon, with any restrictions indicators
      // but not clearly marked as restricted, err on the side of caution
      if (result.isAmazon && 
          result.details.isIframe && 
          result.restrictionChecks.length > 0 && 
          !result.restricted) {
        result.restricted = true;
        result.reason = 'amazon_potential_restrictions';
        result.severity = result.severity === 'none' ? 'low' : result.severity;
      }
      
      // Log detailed information about Amazon iframes at debug level
      console.debug('Bitcoin Price Tag: Detected Amazon iframe', {
        restricted: result.restricted,
        reason: result.reason,
        severity: result.severity,
        checks: result.restrictionChecks,
        details: result.details,
      });
    }
    
    return result;
  } catch (e) {
    // If anything fails in detection, assume restricted for safety
    console.warn('Bitcoin Price Tag: Error detecting Amazon iframe, assuming restricted', e.message);
    return {
      isAmazon: true, // Assume it's Amazon if detection fails
      restricted: true,
      reason: 'detection_error',
      severity: 'high',
      details: { error: e.message },
    };
  }
}

/**
 * Initialize scanning for a page
 * Enhanced with improved context detection, WeakSet management, and error handling
 * 
 * @param {Document} document - The document to scan
 * @param {number} btcPrice - Bitcoin price
 * @param {number} satPrice - Satoshi price
 * @param {Object} [options] - Additional options for processing
 * @param {boolean} [options.forceRescan] - Force a rescan even if previously scanned
 * @param {boolean} [options.skipLazyLoading] - Skip setting up lazy loading
 * @param {boolean} [options.aggressiveScan] - Use more aggressive scanning settings
 * @returns {Object} Information about scan results including whether scanning was skipped
 */
export function initScanning(document, btcPrice, satPrice, options = {}) {
  // Result object to track the scanning initialization
  const result = {
    skipped: false,
    reason: null,
    scanStats: null,
    startTime: Date.now(),
    endTime: null,
    contextSeverity: 'none',
    isAmazon: false,
    contextRestrictions: null,
    error: null,
    weakSetReset: false,
  };
  
  try {
    // Reset the processed nodes cache by creating a new WeakSet instance
    // (WeakSet doesn't have a clear() method)
    try {
      processedNodes = new WeakSet();
      result.weakSetReset = true;
    } catch (weakSetError) {
      console.debug('Bitcoin Price Tag: Error creating WeakSet', weakSetError.message);
      result.error = 'weakset_creation_failed';
      // We'll attempt to continue even without a WeakSet, but might have duplicate processing
    }
    
    // Perform comprehensive context detection to determine if scanning is safe
    
    // First check for general iframe restrictions
    const iframeRestrictions = isInRestrictedIframe();
    result.contextRestrictions = { iframeRestrictions };
    
    // Then check specifically for Amazon iframe restrictions
    const amazonRestrictions = isAmazonRestrictedIframe();
    result.contextRestrictions.amazonRestrictions = amazonRestrictions;
    result.isAmazon = amazonRestrictions.isAmazon;
    
    // Determine the overall context severity
    if (amazonRestrictions.severity === 'high' || iframeRestrictions.severity === 'high') {
      result.contextSeverity = 'high';
    } else if (amazonRestrictions.severity === 'medium' || iframeRestrictions.severity === 'medium') {
      result.contextSeverity = 'medium';
    } else if (amazonRestrictions.severity === 'low' || iframeRestrictions.severity === 'low') {
      result.contextSeverity = 'low';
    }
    
    // Combine the results - if either detection indicates restrictions, we should skip
    const isRestricted = iframeRestrictions.restricted || 
                        (amazonRestrictions.isAmazon && amazonRestrictions.restricted);
    
    // Skip scanning in restricted contexts or for high severity cases
    if (isRestricted || result.contextSeverity === 'high') {
      // Determine the reason for skipping based on which check failed
      const reason = amazonRestrictions.restricted ? 
                   `Amazon restricted frame: ${amazonRestrictions.reason}` : 
                   `Restricted iframe: ${iframeRestrictions.reason}`;
      
      result.skipped = true;
      result.reason = reason;
      
      console.warn(`Bitcoin Price Tag: Skipping DOM scanning in restricted context - ${reason}`);
      
      // Record additional context details
      result.restrictionDetails = {
        isAmazon: amazonRestrictions.isAmazon,
        severity: result.contextSeverity,
        generalRestrictions: {
          restricted: iframeRestrictions.restricted,
          reason: iframeRestrictions.reason,
          severity: iframeRestrictions.severity,
        },
        amazonRestrictions: amazonRestrictions.isAmazon ? {
          restricted: amazonRestrictions.restricted,
          reason: amazonRestrictions.reason,
          severity: amazonRestrictions.severity,
        } : null,
      };
      
      result.endTime = Date.now();
      return result;
    }
    
    // Check if the document and body are accessible with defensive coding
    if (!document) {
      console.warn('Bitcoin Price Tag: Document not available');
      result.skipped = true;
      result.reason = 'document_missing';
      result.endTime = Date.now();
      return result;
    }
    
    // Try to access document.body with error handling
    let bodyAccessible = false;
    try {
      bodyAccessible = !!document.body;
    } catch (bodyAccessError) {
      console.warn('Bitcoin Price Tag: Cannot access document.body', bodyAccessError.message);
      result.skipped = true;
      result.reason = 'body_access_error';
      result.error = bodyAccessError.message;
      result.endTime = Date.now();
      return result;
    }
    
    if (!bodyAccessible) {
      console.warn('Bitcoin Price Tag: Document.body not available');
      result.skipped = true;
      result.reason = 'body_missing';
      result.endTime = Date.now();
      return result;
    }
    
    // If we're here, the context is suitable for scanning
    try {
      // Configure scan options based on the detected context
      const scanOptions = {
        isRestrictedContext: false, // We've already determined we're in a safe context
        isAmazonRestricted: false,  // We've already determined we're in a safe context
        skipTargetedScan: options.skipTargetedScan || false,
        skipCompleteScan: options.skipCompleteScan || false,
        maxOperations: options.aggressiveScan ? 25000 : 15000,
      };
      
      // For medium severity contexts, we're more conservative
      if (result.contextSeverity === 'medium') {
        scanOptions.maxOperations = options.aggressiveScan ? 15000 : 10000;
      }
      
      // For low severity contexts, we proceed normally but with some caution
      if (result.contextSeverity === 'low') {
        scanOptions.maxOperations = options.aggressiveScan ? 20000 : 12000;
      }
      
      // If we're on Amazon (but not in a restricted context), be more conservative
      if (amazonRestrictions.isAmazon && !amazonRestrictions.restricted) {
        scanOptions.maxOperations = Math.min(scanOptions.maxOperations, 12000);
      }
      
      // Scan the visible DOM first with options
      const scanStats = scanDomForPrices(document.body, btcPrice, satPrice, scanOptions);
      result.scanStats = scanStats;
      
      // Set up an IntersectionObserver for lazy processing unless explicitly skipped
      if (!options.skipLazyLoading && window.IntersectionObserver) {
        try {
          setupLazyProcessing(document, btcPrice, satPrice, {
            contextSeverity: result.contextSeverity,
            isAmazon: amazonRestrictions.isAmazon,
          });
          result.lazyLoadingSetup = true;
        } catch (observerError) {
          console.debug('Bitcoin Price Tag: Error setting up lazy loading', observerError.message);
          result.lazyLoadingError = observerError.message;
        }
      } else {
        result.lazyLoadingSetup = false;
      }
      
      // Record success
      result.skipped = false;
      result.completedSuccessfully = scanStats.completedSuccessfully;
      
      // Record detailed scanning results
      result.totalNodesProcessed = scanStats.totalNodesProcessed;
      result.totalConversions = scanStats.totalConversions;
      result.scanDuration = scanStats.duration;
      
      result.endTime = Date.now();
      return result;
    } catch (e) {
      // Handle any errors in the main scanning process
      console.error('Bitcoin Price Tag: Error initializing scanning', e.message);
      
      result.skipped = true;
      result.reason = 'scanning_error';
      result.error = e.message;
      
      // Try to include stack trace for debugging
      if (e.stack) {
        result.errorStack = e.stack;
      }
      
      result.endTime = Date.now();
      return result;
    }
  } catch (e) {
    // Outermost catch for any unexpected errors in the initialization process
    console.error('Bitcoin Price Tag: Critical error in scan initialization', e.message);
    
    result.skipped = true;
    result.reason = 'critical_initialization_error';
    result.error = e.message;
    
    // Try to include stack trace for debugging
    if (e.stack) {
      result.errorStack = e.stack;
    }
    
    result.endTime = Date.now();
    return result;
  }
}

/**
 * Set up lazy processing of off-screen content
 * Enhanced with context-aware safety checks and performance optimizations
 * 
 * @param {Document} document - The document to scan
 * @param {number} btcPrice - Bitcoin price
 * @param {number} satPrice - Satoshi price
 * @param {Object} [options] - Additional options for processing
 * @param {string} [options.contextSeverity] - Severity of the detected context restrictions
 * @param {boolean} [options.isAmazon] - Whether the page is on Amazon
 * @param {number} [options.observerMargin=200] - Margin in pixels for the observer
 * @param {number} [options.batchSize=10] - Number of elements to process in each batch
 * @param {number} [options.throttleDelay=200] - Delay in ms for throttling scroll handling
 * @returns {Object} Information about the lazy processing setup
 */
export function setupLazyProcessing(document, btcPrice, satPrice, options = {}) {
  // Result object to track setup status
  const result = {
    success: false,
    observerCreated: false,
    containersObserved: 0,
    scrollHandlerAttached: false,
    error: null,
  };
  
  try {
    // Input validation
    if (!document) {
      result.error = 'null_document';
      return result;
    }
    
    if (!btcPrice || isNaN(btcPrice) || btcPrice <= 0) {
      result.error = 'invalid_btc_price';
      return result;
    }
    
    if (!satPrice || isNaN(satPrice) || satPrice <= 0) {
      result.error = 'invalid_sat_price';
      return result;
    }
    
    // Set up options with safe defaults and context-aware adjustments
    const observerMargin = options.observerMargin || 200;
    const batchSize = options.batchSize || 10;
    
    // Adjust parameters based on context severity
    let throttleDelay = options.throttleDelay || 200;
    let maxBatchElements = 500; // Safety limit for scroll handler
    
    // If we're in a context with any level of restriction, be more conservative
    if (options.contextSeverity === 'medium') {
      throttleDelay = 300; // Slower throttle
      maxBatchElements = 300; // Fewer elements
    } else if (options.contextSeverity === 'low') {
      throttleDelay = 250; // Slightly slower throttle
      maxBatchElements = 400; // Fewer elements
    }
    
    // For Amazon pages, be even more cautious
    if (options.isAmazon) {
      throttleDelay = Math.max(throttleDelay, 250); // At least 250ms
      maxBatchElements = Math.min(maxBatchElements, 300); // At most 300 elements
    }
    
    // Create IntersectionObserver with safety handling
    let observer = null;
    try {
      // Check if IntersectionObserver is available in this environment
      if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function') {
        observer = new window.IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            try {
              if (entry.isIntersecting && entry.target) {
                // Process the element that just became visible with context-aware options
                walkDomTree(
                  entry.target, 
                  btcPrice, 
                  satPrice, 
                  false, 
                  {
                    // Lower operations limit for lazy-loaded elements
                    maxOperations: options.contextSeverity === 'medium' ? 5000 : 
                                   options.contextSeverity === 'low' ? 8000 : 10000,
                    maxStackSize: 100, // Smaller stack for lazy elements
                  },
                );
                
                // Unobserve it after processing
                try {
                  observer.unobserve(entry.target);
                } catch (unobserveError) {
                  // Non-critical if unobserve fails
                  console.debug('Bitcoin Price Tag: Error unobserving element', {
                    error: unobserveError.message,
                  });
                }
              }
            } catch (entryError) {
              console.debug('Bitcoin Price Tag: Error processing intersection entry', {
                error: entryError.message,
              });
              // Continue with other entries
            }
          }
        },
        { 
          rootMargin: `${observerMargin}px`,  // Dynamic margin based on options
          threshold: 0.1, // Only need small visibility to start processing
        },
      );
      }
      
      result.observerCreated = !!observer;
    } catch (observerError) {
      console.debug('Bitcoin Price Tag: Error creating IntersectionObserver', {
        error: observerError.message,
      });
      result.error = 'observer_creation_failed';
      // Continue with scroll handler fallback
    }
    
    // Observe containers if observer was created successfully
    if (observer) {
      try {
        // Use more comprehensive selector pattern for finding containers
        const containerSelectors = [
          'main', 'section', 'article', 
          '.content', '#content', '[role="main"]',
          // Additional common container patterns
          '[class*="container"]', '[class*="wrapper"]', '[class*="content"]',
          // Amazon-specific containers
          '.a-container', '[class*="product"]',
          // Generic large blocks that might contain prices
          '.page', '.body', '.main',
        ];
        
        // Find all potential containers with error handling
        let containers = [];
        try {
          containers = document.querySelectorAll(containerSelectors.join(', '));
        } catch (selectorError) {
          // If complex selector fails, try simpler fallback
          try {
            containers = document.querySelectorAll('main, section, article, .content, #content');
          } catch (fallbackError) {
            // If all selectors fail, just use body as fallback
            try {
              if (document.body) {
                containers = [document.body];
              }
            } catch (bodyError) {
              // Give up on container observation
              console.debug('Bitcoin Price Tag: Cannot find any containers', {
                error: bodyError.message,
              });
            }
          }
        }
        
        // Limit the number of containers to observe based on context
        const maxContainers = options.contextSeverity === 'medium' ? 5 : 
                             options.contextSeverity === 'low' ? 10 : 15;
        
        // Observe each container with safety handling
        let observedCount = 0;
        for (let i = 0; i < containers.length && observedCount < maxContainers; i++) {
          try {
            const container = containers[i];
            if (container) {
              observer.observe(container);
              observedCount++;
            }
          } catch (observeError) {
            console.debug('Bitcoin Price Tag: Error observing container', {
              error: observeError.message,
            });
            // Continue with next container
          }
        }
        
        result.containersObserved = observedCount;
      } catch (containerError) {
        console.debug('Bitcoin Price Tag: Error setting up container observation', {
          error: containerError.message,
        });
        // Continue with scroll handler
      }
    }
    
    // Create a throttled scroll handler with safety precautions
    try {
      const throttledScrollHandler = throttle(() => {
        try {
          // Use safe selector with fallbacks
          let visibleElements = [];
          try {
            // Try to find unprocessed elements
            visibleElements = document.querySelectorAll('div:not([data-btc-processed])');
          } catch (selectorError) {
            // On selector error, use a simpler fallback
            try {
              visibleElements = document.querySelectorAll('div');
            } catch (fallbackError) {
              // Give up on scroll handler if we can't select elements
              return;
            }
          }
          
          // Limit the number of elements to process for safety
          const elementCount = Math.min(visibleElements.length, maxBatchElements);
          
          // Skip if no elements or too many (performance concern)
          if (elementCount === 0) {
            return;
          }
          
          // Process in batches to avoid blocking the main thread
          let index = 0;
          
          const processBatch = () => {
            try {
              // Calculate batch end with safety bounds
              const endIndex = Math.min(index + batchSize, elementCount);
              
              // Process a batch of elements
              for (let i = index; i < endIndex; i++) {
                try {
                  const el = visibleElements[i];
                  if (!el) continue; // Skip null elements
                  
                  // Skip already processed elements
                  let alreadyProcessed = false;
                  try {
                    if (typeof el.hasAttribute === 'function' && el.hasAttribute('data-btc-processed')) {
                      alreadyProcessed = true;
                    } else if (processedNodes && typeof processedNodes.has === 'function' && processedNodes.has(el)) {
                      alreadyProcessed = true;
                    }
                  } catch (attributeError) {
                    // If attribute checking fails, assume not processed
                    alreadyProcessed = false;
                  }
                  
                  if (alreadyProcessed) continue;
                  
                  // Check visibility safely
                  let isVisible = false;
                  try {
                    isVisible = isNodeVisible(el);
                  } catch (visibilityError) {
                    // If visibility check fails, assume visible to avoid missing prices
                    isVisible = true;
                  }
                  
                  if (isVisible) {
                    // Mark as processed with error handling
                    try {
                      if (typeof el.setAttribute === 'function') {
                        el.setAttribute('data-btc-processed', 'true');
                      }
                      
                      if (processedNodes && typeof processedNodes.add === 'function') {
                        processedNodes.add(el);
                      }
                    } catch (markingError) {
                      // Continue even if marking fails
                    }
                    
                    // Process the element with context-aware options
                    walkDomTree(
                      el, 
                      btcPrice, 
                      satPrice, 
                      false, 
                      {
                        // Lower operations limit for scroll-triggered elements
                        maxOperations: options.contextSeverity === 'medium' ? 3000 : 
                                      options.contextSeverity === 'low' ? 5000 : 8000,
                        maxStackSize: 80, // Smaller stack for scroll elements
                      },
                    );
                  }
                } catch (elementError) {
                  console.debug('Bitcoin Price Tag: Error processing element in scroll handler', {
                    error: elementError.message,
                  });
                  // Continue with next element
                }
              }
              
              // Continue with next batch if more elements with delay based on context
              index = endIndex;
              if (index < elementCount) {
                // Use variable timeout based on context
                const batchDelay = options.contextSeverity === 'medium' ? 50 : 
                                  options.contextSeverity === 'low' ? 20 : 0;
                                  
                setTimeout(processBatch, batchDelay);
              }
            } catch (batchError) {
              console.debug('Bitcoin Price Tag: Error processing batch in scroll handler', {
                error: batchError.message,
              });
              // Stop batch processing on error
            }
          };
          
          // Start processing the first batch
          processBatch();
        } catch (scrollHandlerError) {
          console.debug('Bitcoin Price Tag: Error in scroll handler', {
            error: scrollHandlerError.message,
          });
          // Non-critical if scroll handler fails
        }
      }, throttleDelay, { leading: true, trailing: true });
      
      // Add the throttled scroll listener with safety handling
      try {
        window.addEventListener('scroll', throttledScrollHandler, { passive: true });
        result.scrollHandlerAttached = true;
      } catch (listenerError) {
        console.debug('Bitcoin Price Tag: Error attaching scroll handler', {
          error: listenerError.message,
        });
        // Non-critical if scroll handler attachment fails
      }
    } catch (handlerError) {
      console.debug('Bitcoin Price Tag: Error creating scroll handler', {
        error: handlerError.message,
      });
      // Non-critical if scroll handler creation fails
    }
    
    // Overall success if at least one mechanism (observer or scroll) was set up
    result.success = result.observerCreated || result.scrollHandlerAttached;
    
    return result;
  } catch (e) {
    // Handle any unexpected errors in the overall setup process
    console.debug('Bitcoin Price Tag: Critical error setting up lazy processing', {
      error: e.message,
      stack: e.stack,
    });
    
    result.error = 'critical_setup_error';
    result.errorDetails = e.message;
    
    return result;
  }
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
  subtree: true,
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