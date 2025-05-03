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
  UNKNOWN: 'unknown'         // Uncategorized errors
};

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  INFO: 'info',         // Informational, non-critical
  WARNING: 'warning',   // Warning, might affect functionality
  ERROR: 'error',       // Error, affects functionality but non-fatal
  CRITICAL: 'critical'  // Critical, prevents core functionality
};

/**
 * Enhanced error logger
 * @param {Error} error - The error object
 * @param {Object} context - Additional context information
 * @param {string} [context.severity] - Error severity level
 */
export function logError(error, context = {}) {
  const errorDetails = {
    message: error.message,
    type: error.type || categorizeError(error),
    severity: context.severity || ErrorSeverity.ERROR,
    timestamp: new Date().toISOString(),
    stack: error.stack,
    ...context
  };
  
  // Log to console with enhanced formatting
  console.error(`Bitcoin Price Tag Error [${errorDetails.type}][${errorDetails.severity}]:`, 
    errorDetails.message, errorDetails);
    
  // In the future, this could send telemetry if enabled by the user
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