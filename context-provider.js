/**
 * Context Provider for Bitcoin Price Tag
 * 
 * This module provides standardized context information for error logging and debugging.
 * It centralizes context gathering to ensure consistent information is available across
 * all modules, especially for error reporting and diagnostic logging.
 */

// Import browser detection for environment info
import { detectBrowser, checkFeatureSupport } from './browser-detect.js';

// Cached context values to avoid repeated expensive operations
let _cachedPageContext = null;
let _cachedBrowserContext = null;
let _cachedExtensionContext = null;

// Correlation ID (unique per page load)
const correlationId = generateCorrelationId();

/**
 * Generate a unique correlation ID
 * @returns {string} A unique correlation ID
 */
function generateCorrelationId() {
  return 'btc-' + 
    Date.now().toString(36) + '-' + 
    Math.random().toString(36).substring(2, 9);
}

/**
 * Get the current correlation ID
 * @returns {string} The current correlation ID
 */
export function getCorrelationId() {
  return correlationId;
}

/**
 * Reset cached context - useful for testing or when page state changes significantly
 */
export function resetContextCache() {
  _cachedPageContext = null;
  _cachedBrowserContext = null;
  _cachedExtensionContext = null;
}

/**
 * Check if a URL is likely an Amazon page
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL appears to be an Amazon page
 */
function isAmazonUrl(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    return domain.includes('amazon.') || 
           domain.endsWith('amazon') || 
           domain.includes('.amazon');
  } catch (e) {
    // If URL parsing fails, check string directly
    return url.toLowerCase().includes('amazon.');
  }
}

/**
 * Detect Amazon page type based on URL and document structure
 * @returns {string|null} Amazon page type or null if not detected
 */
function detectAmazonPageType() {
  if (!isAmazonUrl(window.location.href)) {
    return null;
  }
  
  // Try to detect based on URL pattern first
  const path = window.location.pathname.toLowerCase();
  
  if (path.includes('/dp/') || path.includes('/gp/product/')) {
    return 'product';
  } else if (path.includes('/s') && (
    path.includes('keywords=') || 
    window.location.search.includes('keywords=')
  )) {
    return 'search';
  } else if (path.includes('/cart') || path.includes('/gp/cart')) {
    return 'cart';
  } else if (path.includes('/checkout/') || path.includes('/gp/buy')) {
    return 'checkout';
  } else if (path.includes('/order-history') || path.includes('/your-orders')) {
    return 'orders';
  } else if (path.includes('/wishlist')) {
    return 'wishlist';
  }
  
  // Fallback to DOM structure detection
  try {
    if (document.querySelector('#dp, #productDetails, #centerCol, #ppd')) {
      return 'product';
    } else if (document.querySelector('#search, .s-search-results')) {
      return 'search';
    } else if (document.querySelector('.sc-cart-contents, #cart-contents')) {
      return 'cart';
    }
  } catch (e) {
    // Ignore DOM detection errors
  }
  
  return 'other';
}

/**
 * Detect the iframe structure of the current page
 * @returns {Object} Information about the iframe structure
 */
function detectIframeStructure() {
  const result = {
    isIframe: window !== window.top,
    depth: 0,
    iframeChain: [],
    crossOrigin: false
  };
  
  if (!result.isIframe) {
    return result;
  }
  
  // Determine iframe depth
  let current = window;
  let depth = 0;
  let crossOrigin = false;
  
  while (current !== current.top) {
    depth++;
    
    // Try to access parent's location - will throw if cross-origin
    try {
      const parentLocation = current.parent.location.href;
      result.iframeChain.push({
        depth,
        crossOrigin: false,
        url: parentLocation
      });
    } catch (e) {
      crossOrigin = true;
      result.iframeChain.push({
        depth,
        crossOrigin: true,
        url: null
      });
    }
    
    current = current.parent;
  }
  
  result.depth = depth;
  result.crossOrigin = crossOrigin;
  
  return result;
}

/**
 * Safely get window location information
 * @returns {Object} Safe window location information
 */
function getSafeLocationInfo() {
  try {
    if (!window || !window.location) {
      return {
        available: false,
        reason: 'window_or_location_undefined'
      };
    }
    
    return {
      available: true,
      href: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      host: window.location.host,
      hostname: window.location.hostname,
      protocol: window.location.protocol
    };
  } catch (e) {
    return {
      available: false,
      reason: 'location_access_error',
      error: e.message
    };
  }
}

/**
 * Check extension API availability
 * @returns {Object} Information about extension API availability
 */
function checkExtensionApi() {
  const result = {
    available: false,
    apis: {
      runtime: false,
      storage: false,
      tabs: false
    },
    details: {}
  };
  
  if (typeof chrome === 'undefined') {
    result.details.reason = 'chrome_undefined';
    return result;
  }
  
  // Check basic API existence
  result.apis.runtime = typeof chrome.runtime !== 'undefined';
  result.apis.storage = typeof chrome.storage !== 'undefined';
  result.apis.tabs = typeof chrome.tabs !== 'undefined';
  
  // Try to actively use the runtime API
  if (result.apis.runtime) {
    try {
      result.details.extensionId = chrome.runtime.id;
      result.details.hasGetURL = typeof chrome.runtime.getURL === 'function';
      result.available = true;
    } catch (e) {
      result.details.runtimeError = e.message;
      result.available = false;
    }
  }
  
  return result;
}

/**
 * Get basic page context information
 * @returns {Object} Page context information
 */
export function getPageContext() {
  // Return cached context if available
  if (_cachedPageContext) {
    return _cachedPageContext;
  }
  
  const locationInfo = getSafeLocationInfo();
  
  const pageContext = {
    url: locationInfo.available ? locationInfo.href : 'unavailable',
    origin: locationInfo.available ? locationInfo.origin : 'unavailable',
    pathname: locationInfo.available ? locationInfo.pathname : 'unavailable',
    pageTitle: typeof document !== 'undefined' ? document.title : 'unavailable',
    referrer: typeof document !== 'undefined' ? document.referrer : 'unavailable',
    isAmazon: isAmazonUrl(locationInfo.available ? locationInfo.href : null),
    amazonPageType: detectAmazonPageType(),
    iframe: detectIframeStructure(),
    timestamp: new Date().toISOString(),
    correlationId
  };
  
  // Cache the result
  _cachedPageContext = pageContext;
  
  return pageContext;
}

/**
 * Get browser context information
 * @returns {Object} Browser context information
 */
export function getBrowserContext() {
  // Return cached context if available
  if (_cachedBrowserContext) {
    return _cachedBrowserContext;
  }
  
  const browser = detectBrowser();
  const features = checkFeatureSupport();
  
  const browserContext = {
    name: browser.name,
    version: browser.version,
    userAgent: browser.userAgent,
    language: navigator.language || 'unknown',
    platform: navigator.platform || 'unknown',
    features: {
      mutationObserver: features.mutationObserver,
      fetchSupport: features.fetchSupport,
      promiseSupport: features.promiseSupport,
      storageAPI: features.storageAPI,
      runtimeAPI: features.runtimeAPI
    },
    online: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
    cookiesEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : 'unknown',
    timestamp: new Date().toISOString(),
    correlationId
  };
  
  // Cache the result
  _cachedBrowserContext = browserContext;
  
  return browserContext;
}

/**
 * Get extension context information
 * @returns {Object} Extension context information
 */
export function getExtensionContext() {
  // Return cached context if available
  if (_cachedExtensionContext) {
    return _cachedExtensionContext;
  }
  
  const extensionApi = checkExtensionApi();
  
  const extensionContext = {
    apiAvailable: extensionApi.available,
    extensionId: extensionApi.details.extensionId || 'unavailable',
    apis: extensionApi.apis,
    bridgeAvailable: typeof window !== 'undefined' && 
                   typeof window.bitcoinPriceTagBridge !== 'undefined',
    manifest: getBridgeManifestInfo(),
    timestamp: new Date().toISOString(),
    correlationId
  };
  
  // Cache the result
  _cachedExtensionContext = extensionContext;
  
  return extensionContext;
}

/**
 * Get manifest information from the bridge if available
 * @returns {Object} Manifest information
 */
function getBridgeManifestInfo() {
  if (typeof window === 'undefined' || 
      typeof window.bitcoinPriceTagBridge === 'undefined' ||
      typeof window.bitcoinPriceTagBridge.manifestInfo === 'undefined') {
    return {
      available: false
    };
  }
  
  try {
    const manifestInfo = window.bitcoinPriceTagBridge.manifestInfo;
    return {
      available: true,
      version: manifestInfo.version || 'unknown',
      manifestVersion: manifestInfo.manifestVersion || 'unknown',
      name: manifestInfo.name || 'unknown'
    };
  } catch (e) {
    return {
      available: false,
      error: e.message
    };
  }
}

/**
 * Get complete context object for logging
 * @param {Object} [additionalContext] - Additional context to include
 * @returns {Object} Complete context object
 */
export function getFullContext(additionalContext = {}) {
  return {
    page: getPageContext(),
    browser: getBrowserContext(),
    extension: getExtensionContext(),
    timestamp: new Date().toISOString(),
    correlationId,
    ...additionalContext
  };
}

/**
 * Get lightweight context for frequent logging
 * This includes only essential context to reduce log size
 * @param {Object} [additionalContext] - Additional context to include
 * @returns {Object} Lightweight context object
 */
export function getLightContext(additionalContext = {}) {
  const pageContext = getPageContext();
  const extensionContext = getExtensionContext();
  
  return {
    url: pageContext.url,
    isAmazon: pageContext.isAmazon,
    amazonPageType: pageContext.amazonPageType,
    isIframe: pageContext.iframe.isIframe,
    bridgeAvailable: extensionContext.bridgeAvailable,
    apiAvailable: extensionContext.apiAvailable,
    timestamp: new Date().toISOString(),
    correlationId,
    ...additionalContext
  };
}

/**
 * Generate performance metrics context
 * @param {number} startTime - Operation start time (from Date.now())
 * @param {Object} [details] - Additional operation details
 * @returns {Object} Performance metrics
 */
export function getPerformanceContext(startTime, details = {}) {
  const endTime = Date.now();
  
  return {
    duration: endTime - startTime,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    ...details
  };
}

/**
 * Enrich error context with standard metadata
 * @param {Object} baseContext - The basic context to enrich
 * @returns {Object} Enriched context with standard metadata
 */
export function enrichErrorContext(baseContext = {}) {
  return {
    ...getLightContext(),
    ...baseContext,
    timestamp: new Date().toISOString(),
    correlationId
  };
}

/**
 * Create an event context object for logging user interactions or system events
 * @param {string} eventName - Name of the event
 * @param {string} eventCategory - Category of the event
 * @param {Object} [details] - Additional event details
 * @returns {Object} Event context
 */
export function createEventContext(eventName, eventCategory, details = {}) {
  return {
    event: {
      name: eventName,
      category: eventCategory,
      timestamp: new Date().toISOString(),
      ...details
    },
    ...getLightContext()
  };
}

/**
 * Create a decision point context object for logging system decisions
 * @param {string} decision - The decision made
 * @param {string} reason - The reason for the decision
 * @param {Object} [details] - Additional decision details
 * @returns {Object} Decision context
 */
export function createDecisionContext(decision, reason, details = {}) {
  return {
    decision: {
      outcome: decision,
      reason: reason,
      timestamp: new Date().toISOString(),
      ...details
    },
    ...getLightContext()
  };
}

/**
 * Check if the current context is likely to cause extension issues
 * @returns {Object} Risk assessment of the current context
 */
export function assessContextRisk() {
  const pageContext = getPageContext();
  const extensionContext = getExtensionContext();
  
  const risks = [];
  let riskLevel = 'none';
  
  // Check for iframe issues
  if (pageContext.iframe.isIframe) {
    if (pageContext.iframe.crossOrigin) {
      risks.push('cross_origin_iframe');
      riskLevel = 'high';
    } else if (pageContext.iframe.depth > 1) {
      risks.push('deep_iframe_nesting');
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
    } else {
      risks.push('iframe');
      riskLevel = riskLevel === 'high' || riskLevel === 'medium' ? riskLevel : 'low';
    }
  }
  
  // Check for API issues
  if (!extensionContext.apiAvailable) {
    risks.push('extension_api_unavailable');
    riskLevel = 'high';
  }
  
  // Check for bridge issues
  if (!extensionContext.bridgeAvailable && pageContext.iframe.isIframe) {
    risks.push('bridge_unavailable_in_iframe');
    riskLevel = 'high';
  }
  
  // Check for Amazon-specific issues
  if (pageContext.isAmazon) {
    risks.push('amazon_page');
    
    if (pageContext.amazonPageType === 'product' && pageContext.iframe.isIframe) {
      risks.push('amazon_product_in_iframe');
      riskLevel = 'high';
    } else if (pageContext.amazonPageType === 'checkout') {
      risks.push('amazon_checkout');
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
    }
  }
  
  return {
    risks,
    riskLevel,
    details: {
      isIframe: pageContext.iframe.isIframe,
      iframeDepth: pageContext.iframe.depth,
      crossOrigin: pageContext.iframe.crossOrigin,
      isAmazon: pageContext.isAmazon,
      amazonPageType: pageContext.amazonPageType,
      apiAvailable: extensionContext.apiAvailable,
      bridgeAvailable: extensionContext.bridgeAvailable
    }
  };
}

/**
 * Add timing information to context
 * A utility function for tracking performance across operations
 * @param {Object} context - The context to add timing to
 * @param {string} label - A label for this timing information
 * @param {number} [startTime] - Optional custom start time (from Date.now())
 * @returns {Object} Context with added timing information
 */
export function addTiming(context, label, startTime = null) {
  const now = Date.now();
  const start = startTime || (context._timing?.start || now);
  
  // Create timing object if it doesn't exist
  if (!context._timing) {
    context._timing = { 
      start,
      points: []
    };
  }
  
  // Add this timing point
  context._timing.points.push({
    label,
    timestamp: now,
    elapsed: now - start
  });
  
  return context;
}