/**
 * Error handling utilities for Bitcoin Price Tag extension
 * 
 * Enhanced with context-aware logging and standardized structure.
 */

// Import the context provider for structured logging
import {
  getCorrelationId,
  getPageContext,
  getBrowserContext,
  getExtensionContext,
  getLightContext,
  getFullContext,
  enrichErrorContext,
  assessContextRisk,
  addTiming,
  createDecisionContext
} from './context-provider.js';

/**
 * Error types for categorization
 */
export const ErrorTypes = {
  NETWORK: 'network',        // Network connectivity issues
  TIMEOUT: 'timeout',        // Request timeout
  API: 'api',                // API returned an error status
  PARSING: 'parsing',        // JSON parsing errors
  STORAGE: 'storage',        // Chrome storage errors
  RUNTIME: 'runtime',        // Chrome runtime API errors
  EXTENSION: 'extension',    // Other extension-specific errors
  IFRAME: 'iframe',          // Cross-origin iframe restrictions
  CALLBACK: 'callback',      // Callback execution errors
  DOM: 'dom',                // DOM access errors
  CONTEXT: 'context',        // Execution context errors
  EARLY_EXIT: 'early_exit',  // Early exit due to context restrictions
  AMAZON: 'amazon',          // Amazon-specific issues
  BRIDGE: 'bridge',          // Messaging bridge errors
  VALIDATION: 'validation',  // API or bridge validation errors
  INTEGRITY: 'integrity',    // API or bridge integrity checking errors
  PERFORMANCE: 'performance', // Performance-related issues
  WEAKSET: 'weakset',        // WeakSet related errors
  DOM_SCAN: 'dom_scan',      // DOM scanning specific issues
  CONTENT_SCRIPT: 'content_script', // Content script specific issues
  CSP: 'csp',                // Content Security Policy related issues
  UNKNOWN: 'unknown'         // Uncategorized errors
};

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  DEBUG: 'debug',       // Debug-level, not shown in production
  INFO: 'info',         // Informational, non-critical
  WARNING: 'warning',   // Warning, might affect functionality
  ERROR: 'error',       // Error, affects functionality but non-fatal
  CRITICAL: 'critical'  // Critical, prevents core functionality
};

// Recent errors cache to prevent flooding logs with the same error
// This helps identify repeated errors while reducing log volume
const recentErrors = {
  cache: {},
  maxSize: 50, // Maximum number of distinct errors to track
  expirationMs: 60000 // Expire cached errors after 1 minute
};

// Global logging settings - can be adjusted dynamically
const logSettings = {
  minLevel: 'info',     // Minimum level to log: debug, info, warning, error, critical
  console: true,        // Whether to log to console
  verbose: false,       // Whether to include full details
  prefix: 'Bitcoin Price Tag:',  // Prefix for all logs
  diagnosticMode: false, // Extra verbose for diagnostic purposes
  includeCorrelationId: true, // Include correlation ID in logs
  throttleRepeated: true, // Whether to throttle repeated errors
  amazonDetailLevel: 'medium', // none, low, medium, high - detail level for Amazon pages
  logToStorage: false,  // Whether to log to chrome.storage for later retrieval
  levelsMap: {
    'debug': 0,
    'info': 1,
    'warning': 2,
    'error': 3,
    'critical': 4
  },
  consoleMethodsMap: {
    'debug': 'debug',
    'info': 'info',
    'warning': 'warn',
    'error': 'error',
    'critical': 'error'
  }
};

/**
 * Configure global logging settings
 * @param {Object} settings - New settings to apply
 */
export function configureLogging(settings = {}) {
  // Apply all valid settings
  if (settings.minLevel && logSettings.levelsMap[settings.minLevel] !== undefined) {
    logSettings.minLevel = settings.minLevel;
  }
  
  if (typeof settings.console === 'boolean') {
    logSettings.console = settings.console;
  }
  
  if (typeof settings.verbose === 'boolean') {
    logSettings.verbose = settings.verbose;
  }
  
  if (typeof settings.prefix === 'string') {
    logSettings.prefix = settings.prefix;
  }
  
  if (typeof settings.diagnosticMode === 'boolean') {
    logSettings.diagnosticMode = settings.diagnosticMode;
    
    // In diagnostic mode, automatically set verbose and lower min level
    if (settings.diagnosticMode) {
      logSettings.verbose = true;
      logSettings.minLevel = 'debug';
    }
  }
  
  if (typeof settings.includeCorrelationId === 'boolean') {
    logSettings.includeCorrelationId = settings.includeCorrelationId;
  }
  
  if (typeof settings.throttleRepeated === 'boolean') {
    logSettings.throttleRepeated = settings.throttleRepeated;
  }
  
  if (typeof settings.amazonDetailLevel === 'string') {
    const validLevels = ['none', 'low', 'medium', 'high'];
    if (validLevels.includes(settings.amazonDetailLevel)) {
      logSettings.amazonDetailLevel = settings.amazonDetailLevel;
    }
  }
  
  if (typeof settings.logToStorage === 'boolean') {
    logSettings.logToStorage = settings.logToStorage;
  }
  
  // Clear recent errors cache when settings change
  clearRecentErrorsCache();
  
  return { ...logSettings }; // Return a copy of current settings
}

/**
 * Enable diagnostic mode with optimal settings for debugging
 * This is a convenience function that sets multiple settings at once
 */
export function enableDiagnosticMode() {
  return configureLogging({
    diagnosticMode: true,
    verbose: true,
    minLevel: 'debug',
    includeCorrelationId: true,
    throttleRepeated: false,
    amazonDetailLevel: 'high'
  });
}

/**
 * Clear the recent errors cache
 */
function clearRecentErrorsCache() {
  recentErrors.cache = {};
}

/**
 * Check if an error with the same fingerprint was recently logged
 * @param {string} fingerprint - Error fingerprint
 * @returns {Object} Information about whether this is a repeat error
 */
function checkRecentError(fingerprint) {
  const now = Date.now();
  
  // Clean up expired entries
  for (const key in recentErrors.cache) {
    if (now - recentErrors.cache[key].timestamp > recentErrors.expirationMs) {
      delete recentErrors.cache[key];
    }
  }
  
  // Check if we've logged this error recently
  if (recentErrors.cache[fingerprint]) {
    recentErrors.cache[fingerprint].count++;
    recentErrors.cache[fingerprint].lastSeen = now;
    
    return {
      isRepeat: true,
      count: recentErrors.cache[fingerprint].count,
      firstSeen: recentErrors.cache[fingerprint].timestamp,
      timeElapsed: now - recentErrors.cache[fingerprint].timestamp
    };
  }
  
  // If we have too many entries, remove the oldest one
  const keys = Object.keys(recentErrors.cache);
  if (keys.length >= recentErrors.maxSize) {
    let oldest = keys[0];
    let oldestTime = recentErrors.cache[oldest].timestamp;
    
    for (const key of keys) {
      if (recentErrors.cache[key].timestamp < oldestTime) {
        oldest = key;
        oldestTime = recentErrors.cache[key].timestamp;
      }
    }
    
    delete recentErrors.cache[oldest];
  }
  
  // Record this error
  recentErrors.cache[fingerprint] = {
    timestamp: now,
    count: 1,
    lastSeen: now
  };
  
  return { isRepeat: false, count: 1 };
}

/**
 * Generate an error fingerprint for duplicate detection
 * @param {Error} error - The error object
 * @param {string} errorType - The categorized error type
 * @param {string} context - Additional context string
 * @returns {string} A unique fingerprint for this error
 */
function generateErrorFingerprint(error, errorType, context) {
  // Create a simplified representation of the error for fingerprinting
  const parts = [
    errorType,
    error.message.slice(0, 100), // Limit length to avoid huge fingerprints
    context
  ];
  
  // For some specific error types, add more context to differentiate
  if (errorType === ErrorTypes.DOM) {
    if (error.details && error.details.nodeType) {
      parts.push(`node:${error.details.nodeType}`);
    }
  } else if (errorType === ErrorTypes.NETWORK) {
    if (error.details && error.details.url) {
      const url = new URL(error.details.url);
      parts.push(`host:${url.hostname}`);
    }
  } else if (errorType === ErrorTypes.AMAZON) {
    if (error.details && error.details.amazonPageType) {
      parts.push(`amzn:${error.details.amazonPageType}`);
    }
  }
  
  return parts.join('|');
}

/**
 * Determine if a message should be logged based on its severity
 * @param {string} severity - The severity level to check
 * @returns {boolean} Whether the message should be logged
 */
function shouldLog(severity) {
  const minLevel = logSettings.levelsMap[logSettings.minLevel] || 0;
  const messageLevel = logSettings.levelsMap[severity] || 0;
  return messageLevel >= minLevel;
}

/**
 * Enhanced error logger that controls output format and verbosity
 * Now with context enrichment and correlation tracking
 * 
 * @param {Error} error - The error object
 * @param {Object} context - Additional context information
 * @param {string} [context.severity] - Error severity level
 * @param {boolean} [context.silent] - Whether to suppress console output
 * @param {boolean} [context.skipContextEnrichment] - Skip automatic context enrichment
 */
export function logError(error, context = {}) {
  const errorType = error.type || categorizeError(error);
  const severity = context.severity || ErrorSeverity.ERROR;
  
  // Skip if below minimum logging level
  if (!shouldLog(severity)) {
    return;
  }
  
  // Keep track of processing start time for performance monitoring
  const startTime = Date.now();
  
  // Determine if we should use rich context or not
  const useRichContext = logSettings.diagnosticMode || 
                       severity === ErrorSeverity.CRITICAL || 
                       (context.enrichContext !== false && !context.skipContextEnrichment);
  
  // Create sanitized context for logging
  let sanitizedContext = sanitizeContextForLogging(context);
  
  // Add correlation ID to all errors if enabled
  if (logSettings.includeCorrelationId) {
    sanitizedContext.correlationId = getCorrelationId();
  }
  
  // Add enhanced context if in diagnostic mode or for critical errors
  if (useRichContext) {
    // Get page context unless it's explicitly disabled
    if (!context.skipPageContext) {
      try {
        const pageContext = getLightContext();
        sanitizedContext.page = pageContext;
      } catch (contextError) {
        // If context gathering fails, just note the failure
        sanitizedContext.contextError = `Failed to gather page context: ${contextError.message}`;
      }
    }
    
    // Get browser context for certain error types that may be browser-specific
    if (errorType === ErrorTypes.RUNTIME || errorType === ErrorTypes.EXTENSION || 
        errorType === ErrorTypes.CONTEXT || errorType === ErrorTypes.CSP ||
        severity === ErrorSeverity.CRITICAL) {
      try {
        const browserContext = getBrowserContext();
        sanitizedContext.browser = {
          name: browserContext.name,
          version: browserContext.version,
          features: browserContext.features
        };
      } catch (browserError) {
        // Ignore browser context errors
      }
    }
    
    // Get extension context for extension-related errors
    if (errorType === ErrorTypes.RUNTIME || errorType === ErrorTypes.EXTENSION || 
        errorType === ErrorTypes.BRIDGE || errorType === ErrorTypes.INTEGRITY) {
      try {
        const extensionContext = getExtensionContext();
        sanitizedContext.extension = {
          apiAvailable: extensionContext.apiAvailable,
          bridgeAvailable: extensionContext.bridgeAvailable
        };
      } catch (extensionError) {
        // Ignore extension context errors
      }
    }
    
    // For Amazon-specific issues, add detailed Amazon context if enabled
    if (errorType === ErrorTypes.AMAZON && 
        logSettings.amazonDetailLevel !== 'none') {
      try {
        const pageContext = getPageContext();
        if (pageContext.isAmazon) {
          sanitizedContext.amazon = {
            pageType: pageContext.amazonPageType,
            isIframe: pageContext.iframe.isIframe,
            iframeDepth: pageContext.iframe.depth,
            crossOrigin: pageContext.iframe.crossOrigin
          };
          
          // Add more details for higher detail levels
          if (logSettings.amazonDetailLevel === 'high') {
            // Risk assessment for Amazon pages
            const riskAssessment = assessContextRisk();
            sanitizedContext.amazon.risks = riskAssessment.risks;
            sanitizedContext.amazon.riskLevel = riskAssessment.riskLevel;
          }
        }
      } catch (amazonError) {
        // Ignore Amazon context errors
      }
    }
  }
  
  // Add enhanced diagnostics for network errors
  if (errorType === ErrorTypes.NETWORK || errorType === ErrorTypes.API || errorType === ErrorTypes.TIMEOUT) {
    addNetworkDiagnostics(sanitizedContext);
  }
  
  // Generate error fingerprint for duplicate detection
  const fingerprint = generateErrorFingerprint(error, errorType, context.context || 'unknown');
  
  // Check if this is a repeat error
  const repeatInfo = logSettings.throttleRepeated ? 
                   checkRecentError(fingerprint) : 
                   { isRepeat: false, count: 1 };
  
  // Add timing information to understand error logging performance
  const loggingTime = Date.now() - startTime;
  
  // Construct the final error details
  const errorDetails = {
    message: error.message,
    type: errorType,
    severity: severity,
    context: context.context || 'unknown',
    timestamp: new Date().toISOString(),
    logProcessingTime: loggingTime,
    ...(logSettings.verbose || severity === ErrorSeverity.CRITICAL ? { stack: error.stack } : {}),
    // Include repeat information if it's a duplicate
    ...(repeatInfo.isRepeat ? { 
      repeated: true, 
      repeatCount: repeatInfo.count,
      firstSeen: new Date(repeatInfo.firstSeen).toISOString(),
      timeSinceFirst: repeatInfo.timeElapsed 
    } : {}),
    ...sanitizedContext
  };
  
  // Skip verbose output for repeat errors unless in diagnostic mode
  const skipDueToRepeat = repeatInfo.isRepeat && 
                         logSettings.throttleRepeated && 
                         !logSettings.diagnosticMode && 
                         repeatInfo.count > 3 && 
                         repeatInfo.timeElapsed < 10000;
  
  // Log to console with consistent formatting if not silent and not throttled
  if (logSettings.console && !context.silent && !skipDueToRepeat) {
    // Get appropriate console method based on severity
    const consoleMethod = logSettings.consoleMethodsMap[severity] || 'error';
    
    // Format log message
    let message = `${logSettings.prefix} [${errorDetails.type}] ${errorDetails.message}`;
    
    // Add correlation ID to message if enabled
    if (logSettings.includeCorrelationId) {
      message += ` (${errorDetails.correlationId})`;
    }
    
    // Add repeat information if applicable
    if (repeatInfo.isRepeat) {
      message += ` (repeated ${repeatInfo.count} times)`;
    }
    
    if (logSettings.verbose || logSettings.diagnosticMode) {
      console[consoleMethod](message, errorDetails);
    } else {
      console[consoleMethod](message);
    }
  }
  
  // In diagnostic mode or for critical errors, store logs for later retrieval
  if (logSettings.logToStorage && (logSettings.diagnosticMode || severity === ErrorSeverity.CRITICAL)) {
    storeErrorLog(errorDetails);
  }
  
  // Return the error details for potential further processing
  return errorDetails;
}

/**
 * Store error log to chrome.storage for later retrieval
 * @param {Object} errorDetails - The error details to store
 */
function storeErrorLog(errorDetails) {
  // Only try to store if chrome and storage APIs are available
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return;
  }
  
  try {
    // Get existing logs
    chrome.storage.local.get('errorLogs', (result) => {
      try {
        const logs = result.errorLogs || [];
        
        // Add new log, keep last 100 logs
        logs.unshift(errorDetails);
        if (logs.length > 100) {
          logs.length = 100;
        }
        
        // Store updated logs
        chrome.storage.local.set({ errorLogs: logs });
      } catch (e) {
        // Silent failure for storage operations
      }
    });
  } catch (e) {
    // Silent failure for storage operations
  }
}

/**
 * Retrieve stored error logs
 * @returns {Promise<Array>} Array of stored error logs
 */
export function getStoredErrorLogs() {
  return new Promise((resolve) => {
    // Only try to retrieve if chrome and storage APIs are available
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      resolve([]);
      return;
    }
    
    try {
      chrome.storage.local.get('errorLogs', (result) => {
        resolve(result.errorLogs || []);
      });
    } catch (e) {
      resolve([]);
    }
  });
}

/**
 * Clear stored error logs
 * @returns {Promise<boolean>} Success status
 */
export function clearStoredErrorLogs() {
  return new Promise((resolve) => {
    // Only try to clear if chrome and storage APIs are available
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      resolve(false);
      return;
    }
    
    try {
      chrome.storage.local.remove('errorLogs', () => {
        resolve(true);
      });
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * Sanitize context object for logging to avoid [object Object] in error messages
 * @param {Object} context - The context object to sanitize
 * @returns {Object} - Sanitized context
 */
function sanitizeContextForLogging(context) {
  const result = {};
  
  // Process each property to ensure it's loggable
  for (const [key, value] of Object.entries(context)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (value instanceof Error) {
      // Extract useful info from nested errors
      result[key] = {
        message: value.message,
        name: value.name,
        type: value.type || categorizeError(value),
        stack: value.stack ? value.stack.split('\n')[0] : undefined,
        details: value.details ? sanitizeContextForLogging(value.details) : undefined
      };
    } else if (value instanceof Response) {
      // Handle Response objects specially
      result[key] = {
        status: value.status,
        statusText: value.statusText,
        url: value.url,
        headers: Object.fromEntries(
          // Safely extract headers if possible
          typeof value.headers?.entries === 'function' 
            ? [...value.headers.entries()]
            : []
        ),
        type: value.type
      };
    } else if (value instanceof Node) {
      // Handle DOM nodes specially
      try {
        result[key] = {
          nodeType: value.nodeType,
          nodeName: value.nodeName,
          id: value.id || undefined,
          className: value.className || undefined,
          tagName: value.tagName || undefined,
          textContent: value.textContent ? 
                     (value.textContent.length > 50 ? 
                     value.textContent.substring(0, 50) + '...' : 
                     value.textContent) : 
                     undefined
        };
      } catch (nodeError) {
        result[key] = `[Node access error: ${nodeError.message}]`;
      }
    } else if (typeof value === 'object') {
      try {
        // Try to stringify and parse to create a plain object
        result[key] = JSON.parse(JSON.stringify(value));
      } catch (e) {
        try {
          // If standard serialization fails, try a more verbose approach
          // that handles common non-serializable objects
          const objDesc = {};
          
          // Try to extract common properties safely
          if (value.constructor && value.constructor.name) {
            objDesc.type = value.constructor.name;
          }
          
          // Extract a few common properties if they exist
          ['message', 'name', 'url', 'status', 'code'].forEach(prop => {
            if (value[prop] !== undefined) {
              objDesc[prop] = String(value[prop]);
            }
          });
          
          // If we couldn't extract any properties, use basic string conversion
          if (Object.keys(objDesc).length === 0) {
            result[key] = `[${typeof value}]: ${String(value)}`;
          } else {
            result[key] = objDesc;
          }
        } catch (deepError) {
          // Last resort for truly problematic objects
          result[key] = `[Unserializable ${typeof value}]`;
        }
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Add network diagnostic information to the context
 * @param {Object} context - The context object to add diagnostics to
 */
function addNetworkDiagnostics(context) {
  // Add network status
  context.networkDiagnostics = {
    online: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
    timestamp: new Date().toISOString(),
    fetchPhase: context.fetchPhase || 'unknown'
  };
  
  // Add request information if available
  if (context.url) {
    context.networkDiagnostics.url = context.url;
    
    // Try to parse URL for more structured information
    try {
      const urlObj = new URL(context.url);
      context.networkDiagnostics.hostname = urlObj.hostname;
      context.networkDiagnostics.pathname = urlObj.pathname;
      context.networkDiagnostics.protocol = urlObj.protocol;
    } catch (e) {
      // Parsing failed, keep the original URL only
    }
  }
  
  // Add response information if available
  if (context.status) {
    context.networkDiagnostics.status = context.status;
  }
  
  if (context.statusText) {
    context.networkDiagnostics.statusText = context.statusText;
  }
  
  // Add browser information if available
  if (typeof navigator !== 'undefined') {
    context.networkDiagnostics.userAgent = navigator.userAgent;
  }
  
  // Add DNS information if available via performance API
  if (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function') {
    try {
      const resources = performance.getEntriesByType('resource');
      if (resources && resources.length > 0 && context.url) {
        // Find matching resource
        const matchingResource = resources.find(r => r.name.includes(context.url));
        if (matchingResource) {
          context.networkDiagnostics.performance = {
            dnsTime: matchingResource.domainLookupEnd - matchingResource.domainLookupStart,
            connectTime: matchingResource.connectEnd - matchingResource.connectStart,
            responseTime: matchingResource.responseEnd - matchingResource.responseStart,
            totalTime: matchingResource.responseEnd - matchingResource.startTime
          };
        }
      }
    } catch (perfError) {
      // Ignore performance API errors
    }
  }
}

/**
 * Determine error type from Error object
 * Enhanced with more specific categories
 * @param {Error} error - The error to categorize
 * @returns {string} - The error type
 */
export function categorizeError(error) {
  if (!error) return ErrorTypes.UNKNOWN;
  
  // Look for error.name specific matches first - these are more reliable
  
  // DOM related errors
  if (error.name === 'DOMException') {
    if (error.message.includes('SecurityError')) {
      return ErrorTypes.CONTEXT;
    }
    return ErrorTypes.DOM;
  }
  
  // Timeout errors
  if (error.name === 'AbortError' || 
      error.message.includes('timeout') || 
      error.message.includes('Timeout')) {
    return ErrorTypes.TIMEOUT;
  }
  
  // Network errors
  if (error.name === 'NetworkError' || 
      error.message.includes('NetworkError') || 
      error.message.includes('Failed to fetch') || 
      error.message.includes('Network request failed') ||
      error.message.includes('net::ERR')) {
    return ErrorTypes.NETWORK;
  }
  
  // JSON parsing errors
  if (error.name === 'SyntaxError' || 
      error.message.includes('JSON') || 
      error.message.includes('Unexpected token')) {
    return ErrorTypes.PARSING;
  }
  
  // Content Security Policy violations
  if (error.message.includes('Content Security Policy') || 
      error.message.includes('CSP') ||
      error.message.includes('violated the following')) {
    return ErrorTypes.CSP;
  }
  
  // Now check more specific message pattern matches
  
  // WeakSet issues
  if (error.message.includes('WeakSet') || 
      error.message.includes('processedNodes')) {
    return ErrorTypes.WEAKSET;
  }
  
  // Performance issues
  if (error.message.includes('maximum call stack') || 
      error.message.includes('stack size') || 
      error.message.includes('too much recursion') ||
      error.message.includes('operation limit')) {
    return ErrorTypes.PERFORMANCE;
  }
  
  // DOM scanning issues
  if (error.message.includes('scan') && (
      error.message.includes('DOM') || 
      error.message.includes('node') || 
      error.message.includes('element'))) {
    return ErrorTypes.DOM_SCAN;
  }
  
  // Chrome storage errors
  if (error.message.includes('chrome.storage') || 
      error.message.includes('Storage')) {
    return ErrorTypes.STORAGE;
  }
  
  // Bridge-related errors
  if (error.message.includes('bridge') || 
      error.message.includes('Bridge') ||
      error.message.includes('bitcoinPriceTagBridge')) {
    return ErrorTypes.BRIDGE;
  }
  
  // Validation errors
  if (error.message.includes('validation') || 
      error.message.includes('validate') ||
      error.message.includes('invalid') ||
      error.message.includes('not available')) {
    return ErrorTypes.VALIDATION;
  }
  
  // Context or integrity errors
  if (error.message.includes('Context') || 
      error.message.includes('context') ||
      error.message.includes('integrity') ||
      error.message.includes('health check') ||
      error.message.includes('unavailable')) {
    return ErrorTypes.INTEGRITY;
  }
  
  // Chrome runtime errors
  if (error.message.includes('chrome.runtime') || 
      error.message.includes('Extension context') ||
      error.message.includes('runtime')) {
    return ErrorTypes.RUNTIME;
  }
  
  // Content script specific errors
  if (error.message.includes('content script') || 
      error.message.includes('content_script') ||
      error.message.includes('content module')) {
    return ErrorTypes.CONTENT_SCRIPT;
  }
  
  // Amazon-specific errors
  if (error.message.includes('amazon') || 
      error.message.includes('Amazon')) {
    return ErrorTypes.AMAZON;
  }
  
  // API errors (typically have status codes)
  if (error.status || 
      error.statusCode || 
      error.message.includes('status') || 
      error.message.includes('API')) {
    return ErrorTypes.API;
  }
  
  return ErrorTypes.UNKNOWN;
}

/**
 * Creates an enhanced error with type information and context
 * @param {string} message - Error message
 * @param {string} type - Error type from ErrorTypes
 * @param {Object} details - Additional error details
 * @returns {Error} - Enhanced error object
 */
export function createError(message, type, details = {}) {
  const error = new Error(message);
  error.type = type;
  error.details = details;
  
  // Add correlation ID to error for tracking
  error.correlationId = getCorrelationId();
  
  // Add timestamp for timing analysis
  error.timestamp = Date.now();
  
  return error;
}

/**
 * Wraps a promise with timeout and enhanced context
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} errorMessage - Custom error message on timeout
 * @returns {Promise} - The wrapped promise
 */
export function withTimeout(promise, timeoutMs = 10000, errorMessage = 'Request timed out') {
  return new Promise((resolve, reject) => {
    const operationStart = Date.now();
    
    const timeoutId = setTimeout(() => {
      const error = createError(errorMessage, ErrorTypes.TIMEOUT, { 
        timeoutMs,
        operationStart,
        elapsed: Date.now() - operationStart,
        correlationId: getCorrelationId()
      });
      reject(error);
    }, timeoutMs);
    
    promise.then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        
        // Enhance error with timeout context if not already present
        if (error instanceof Error && !error.details?.operationStart) {
          error.details = error.details || {};
          error.details.operationStart = operationStart;
          error.details.elapsed = Date.now() - operationStart;
          error.details.timeoutMs = timeoutMs;
          error.details.correlationId = error.correlationId || getCorrelationId();
        }
        
        reject(error);
      }
    );
  });
}

/**
 * Executes a function with retry logic and enhanced error context
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} [options.retries=3] - Number of retry attempts
 * @param {number} [options.initialBackoff=1000] - Initial backoff in ms
 * @param {number} [options.maxBackoff=30000] - Maximum backoff in ms
 * @param {Function} [options.shouldRetry] - Function to determine if retry should happen
 * @param {string} [options.context] - Operation context for logging
 * @returns {Promise} - Promise that resolves with the function result
 */
export async function withRetry(fn, options = {}) {
  const {
    retries = 3,
    initialBackoff = 1000,
    maxBackoff = 30000,
    shouldRetry = () => true,
    context = 'unknown_operation'
  } = options;
  
  // Track operation timing
  const operationStart = Date.now();
  let lastError;
  let attempt = 0;
  
  while (attempt <= retries) {
    try {
      // Track timing for this specific attempt
      const attemptStart = Date.now();
      
      // Execute the function
      const result = await fn();
      
      // If successful on a retry, log success after previous failures
      if (attempt > 0 && lastError) {
        logError(createError(
          `Operation succeeded after ${attempt} retries`,
          lastError.type || ErrorTypes.UNKNOWN,
          {
            context,
            successful: true,
            attempts: attempt + 1,
            totalTime: Date.now() - operationStart,
            lastAttemptTime: Date.now() - attemptStart,
            previousError: lastError.message
          }
        ), {
          severity: ErrorSeverity.INFO,
          context: `retry_success_${context}`
        });
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Enhance error with retry context
      if (!error.details) error.details = {};
      error.details.attempt = attempt + 1;
      error.details.maxAttempts = retries + 1;
      error.details.operationStart = operationStart;
      error.details.elapsed = Date.now() - operationStart;
      error.details.context = context;
      
      // Don't retry if we've exhausted attempts or shouldRetry returns false
      if (attempt >= retries || !shouldRetry(error, attempt)) {
        break;
      }
      
      // Calculate backoff with exponential increase and jitter
      const backoff = Math.min(
        initialBackoff * Math.pow(2, attempt) * (0.8 + Math.random() * 0.4),
        maxBackoff
      );
      
      // Log retry attempt with enhanced context
      logError(error, {
        severity: ErrorSeverity.WARNING,
        context: `retry_${context}`,
        attempt: attempt + 1,
        maxAttempts: retries + 1,
        backoff,
        totalElapsed: Date.now() - operationStart,
        retryOperation: context
      });
      
      // Wait for backoff period
      await new Promise(resolve => setTimeout(resolve, backoff));
      
      attempt++;
    }
  }
  
  // If we got here, all retries failed
  if (lastError) {
    lastError.details = {
      ...lastError.details,
      attempts: attempt + 1,
      maxAttempts: retries + 1,
      operationStart,
      totalElapsed: Date.now() - operationStart,
      finalFailure: true,
      context
    };
    throw lastError;
  }
  
  // Should never get here
  throw createError(
    'Unexpected error in retry logic', 
    ErrorTypes.UNKNOWN,
    {
      operationStart,
      totalElapsed: Date.now() - operationStart,
      context
    }
  );
}

/**
 * Log a context detection event with detailed information
 * This is specifically for logging context detection and early exits
 * 
 * @param {Object} contextState - The context detection result
 * @param {string} source - Where this detection occurred (e.g., "bootstrap", "content", "init")
 * @param {boolean} exited - Whether this resulted in an early exit
 */
export function logContextDetection(contextState, source, exited = false) {
  // Skip if below minimum logging level
  const severity = exited ? ErrorSeverity.WARNING : ErrorSeverity.DEBUG;
  if (!shouldLog(severity)) {
    return;
  }
  
  // Get correlation ID for tracking
  const correlationId = getCorrelationId();
  
  // Get lightweight page context
  let pageContext = {};
  try {
    pageContext = getLightContext();
  } catch (e) {
    // Ignore context gathering errors
  }
  
  // Create a decision context
  const decision = exited ? 'early_exit' : 'continue_execution';
  const reason = contextState.restrictionReason || 'context_check';
  
  // Prepare structured log message
  const logEntry = {
    type: exited ? 'early_exit' : 'context_detection',
    source: source,
    correlationId,
    decision,
    isRestricted: contextState.isRestricted,
    restrictionReason: contextState.restrictionReason,
    isAmazonFrame: contextState.isAmazonFrame,
    exited: exited,
    timestamp: new Date().toISOString(),
    details: sanitizeContextForLogging(contextState.details || {}),
    page: pageContext
  };
  
  // Construct base message
  const baseMessage = exited 
    ? `${logSettings.prefix} Early exit in ${source}` 
    : `${logSettings.prefix} Context detected in ${source}`;
  
  // Add restriction reason if present
  const message = contextState.restrictionReason 
    ? `${baseMessage} - ${contextState.restrictionReason}` 
    : baseMessage;
  
  // Use appropriate console method based on severity
  const consoleMethod = logSettings.consoleMethodsMap[severity] || 'debug';
  
  // Log to console with appropriate verbosity
  if (logSettings.console) {
    if (logSettings.verbose || logSettings.diagnosticMode) {
      console[consoleMethod](message, logEntry);
    } else {
      console[consoleMethod](message);
    }
  }
  
  // If this was an early exit, log it as an error for tracking
  if (exited) {
    const errorType = contextState.isAmazonFrame ? ErrorTypes.AMAZON : ErrorTypes.IFRAME;
    const exitError = createError(
      `Early exit in ${source}: ${contextState.restrictionReason || 'unknown reason'}`,
      ErrorTypes.EARLY_EXIT,
      {
        source: source,
        context: contextState,
        correlationId
      }
    );
    
    // Use the standard error logging
    logError(exitError, {
      severity: ErrorSeverity.WARNING,
      context: `${source}_early_exit`,
      silent: true, // Don't duplicate the console output
      skipContextEnrichment: true // Already have context
    });
  }
  
  return logEntry;
}

/**
 * Log a decision point with structured context
 * This is for tracking important decisions made by the code
 * 
 * @param {string} decision - The decision that was made (e.g., "skip_operation", "use_fallback")
 * @param {string} reason - The reason for the decision
 * @param {string} source - The source module/function making the decision
 * @param {Object} details - Additional details about the decision
 * @param {string} [severity=info] - The severity level for this decision
 */
export function logDecision(decision, reason, source, details = {}, severity = ErrorSeverity.INFO) {
  // Skip if below minimum logging level
  if (!shouldLog(severity)) {
    return;
  }
  
  // Create decision context
  const decisionContext = createDecisionContext(decision, reason, details);
  
  // Add source information
  decisionContext.source = source;
  
  // Construct message
  const message = `${logSettings.prefix} [${source}] Decision: ${decision} - ${reason}`;
  
  // Use appropriate console method based on severity
  const consoleMethod = logSettings.consoleMethodsMap[severity] || 'info';
  
  // Log to console with appropriate verbosity
  if (logSettings.console) {
    if (logSettings.verbose || logSettings.diagnosticMode) {
      console[consoleMethod](message, decisionContext);
    } else {
      console[consoleMethod](message);
    }
  }
  
  return decisionContext;
}

/**
 * Log performance statistics
 * @param {Object} stats - Performance statistics
 * @param {string} operation - The operation being measured
 * @param {string} [severity=debug] - Severity level for the log
 */
export function logPerformance(stats, operation, severity = ErrorSeverity.DEBUG) {
  // Skip if below minimum logging level
  if (!shouldLog(severity)) {
    return;
  }
  
  // Create performance context
  const perfContext = {
    operation,
    stats,
    timestamp: new Date().toISOString(),
    correlationId: getCorrelationId()
  };
  
  // Add timing calculations if available
  if (stats.startTime && stats.endTime) {
    perfContext.duration = stats.endTime - stats.startTime;
  }
  
  // Construct message
  const message = `${logSettings.prefix} [Performance] ${operation}: ${
    stats.startTime && stats.endTime ? 
    `${perfContext.duration}ms` : 
    JSON.stringify(stats)
  }`;
  
  // Use appropriate console method based on severity
  const consoleMethod = logSettings.consoleMethodsMap[severity] || 'debug';
  
  // Log to console with appropriate verbosity
  if (logSettings.console) {
    if (logSettings.verbose || logSettings.diagnosticMode) {
      console[consoleMethod](message, perfContext);
    } else {
      console[consoleMethod](message);
    }
  }
  
  return perfContext;
}