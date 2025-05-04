/**
 * Error handling utilities for Bitcoin Price Tag extension
 */

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

// Global logging settings - can be adjusted dynamically
const logSettings = {
  minLevel: 'info',     // Minimum level to log: debug, info, warning, error, critical
  console: true,        // Whether to log to console
  verbose: false,       // Whether to include full details
  prefix: 'Bitcoin Price Tag:',  // Prefix for all logs
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
 * @param {Error} error - The error object
 * @param {Object} context - Additional context information
 * @param {string} [context.severity] - Error severity level
 * @param {boolean} [context.silent] - Whether to suppress console output
 */
export function logError(error, context = {}) {
  const errorType = error.type || categorizeError(error);
  const severity = context.severity || ErrorSeverity.ERROR;
  
  // Skip if below minimum logging level
  if (!shouldLog(severity)) {
    return;
  }
  
  // Create sanitized context for logging
  const sanitizedContext = sanitizeContextForLogging(context);
  
  // Add enhanced diagnostics for network errors
  if (errorType === ErrorTypes.NETWORK || errorType === ErrorTypes.API || errorType === ErrorTypes.TIMEOUT) {
    addNetworkDiagnostics(sanitizedContext);
  }
  
  const errorDetails = {
    message: error.message,
    type: errorType,
    severity: severity,
    timestamp: new Date().toISOString(),
    ...(logSettings.verbose ? { stack: error.stack } : {}),
    ...sanitizedContext
  };
  
  // Log to console with consistent formatting if not silent
  if (logSettings.console && !context.silent) {
    // Get appropriate console method based on severity
    const consoleMethod = logSettings.consoleMethodsMap[severity] || 'error';
    
    // Format log message
    const message = `${logSettings.prefix} [${errorDetails.type}] ${errorDetails.message}`;
    
    if (logSettings.verbose) {
      console[consoleMethod](message, errorDetails);
    } else {
      console[consoleMethod](message);
    }
  }
  
  // Record error for potential telemetry (not implemented yet)
  // This would store errors for later reporting if the user has consented
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
}

/**
 * Determine error type from Error object
 * @param {Error} error - The error to categorize
 * @returns {string} - The error type
 */
export function categorizeError(error) {
  if (!error) return ErrorTypes.UNKNOWN;
  
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
  
  // Chrome storage errors
  if (error.message.includes('chrome.storage') || 
      error.message.includes('Storage')) {
    return ErrorTypes.STORAGE;
  }
  
  // Chrome runtime errors
  if (error.message.includes('chrome.runtime') || 
      error.message.includes('Extension context')) {
    return ErrorTypes.RUNTIME;
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
 * Creates an enhanced error with type information
 * @param {string} message - Error message
 * @param {string} type - Error type from ErrorTypes
 * @param {Object} details - Additional error details
 * @returns {Error} - Enhanced error object
 */
export function createError(message, type, details = {}) {
  const error = new Error(message);
  error.type = type;
  error.details = details;
  return error;
}

/**
 * Wraps a promise with timeout
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} errorMessage - Custom error message on timeout
 * @returns {Promise} - The wrapped promise
 */
export function withTimeout(promise, timeoutMs = 10000, errorMessage = 'Request timed out') {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const error = createError(errorMessage, ErrorTypes.TIMEOUT, { timeoutMs });
      reject(error);
    }, timeoutMs);
    
    promise.then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

/**
 * Executes a function with retry logic
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} [options.retries=3] - Number of retry attempts
 * @param {number} [options.initialBackoff=1000] - Initial backoff in ms
 * @param {number} [options.maxBackoff=30000] - Maximum backoff in ms
 * @param {Function} [options.shouldRetry] - Function to determine if retry should happen
 * @returns {Promise} - Promise that resolves with the function result
 */
export async function withRetry(fn, options = {}) {
  const {
    retries = 3,
    initialBackoff = 1000,
    maxBackoff = 30000,
    shouldRetry = () => true
  } = options;
  
  let lastError;
  let attempt = 0;
  
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if we've exhausted attempts or shouldRetry returns false
      if (attempt >= retries || !shouldRetry(error, attempt)) {
        break;
      }
      
      // Calculate backoff with exponential increase and jitter
      const backoff = Math.min(
        initialBackoff * Math.pow(2, attempt) * (0.8 + Math.random() * 0.4),
        maxBackoff
      );
      
      logError(error, {
        severity: ErrorSeverity.WARNING,
        context: 'retry',
        attempt: attempt + 1,
        maxAttempts: retries + 1,
        backoff
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
      finalFailure: true
    };
    throw lastError;
  }
  
  // Should never get here
  throw createError('Unexpected error in retry logic', ErrorTypes.UNKNOWN);
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
  
  // Prepare structured log message
  const logEntry = {
    type: exited ? 'early_exit' : 'context_detection',
    source: source,
    isRestricted: contextState.isRestricted,
    restrictionReason: contextState.restrictionReason,
    isAmazonFrame: contextState.isAmazonFrame,
    exited: exited,
    timestamp: new Date().toISOString(),
    details: sanitizeContextForLogging(contextState.details || {})
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
    if (logSettings.verbose) {
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
        context: contextState
      }
    );
    
    // Use the standard error logging
    logError(exitError, {
      severity: ErrorSeverity.WARNING,
      context: `${source}_early_exit`,
      silent: true // Don't duplicate the console output
    });
  }
}