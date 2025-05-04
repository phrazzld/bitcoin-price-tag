/**
 * Callback Utilities for Bitcoin Price Tag
 * 
 * Provides utilities for safely handling callbacks, especially for asynchronous operations 
 * and Chrome messaging that might otherwise cause crashes.
 */

import { 
  ErrorTypes, 
  ErrorSeverity, 
  logError, 
  createError 
} from './error-handling.js';

/**
 * Creates a wrapper function that safely executes a callback
 * 
 * This utility helps prevent issues where callbacks:
 * - Are not actually functions (null, undefined, or other types)
 * - Throw unexpected errors during execution
 * - Need to pass through specific context
 * 
 * @param {Function|any} callback - The callback to safely execute (may not be a function)
 * @param {Object} options - Options for the safe callback
 * @param {string} [options.context='unknown'] - Context name for error reporting
 * @param {boolean} [options.silent=false] - Whether to suppress console warnings
 * @param {Function|any} [options.fallback] - Fallback function or value to use if callback isn't valid
 * @param {Object} [options.thisArg] - 'this' context to bind to the callback
 * @returns {Function} A safe wrapper function
 */
export function safeCallback(callback, options = {}) {
  // Default options
  const context = options.context || 'unknown';
  const silent = options.silent || false;
  const thisArg = options.thisArg;
  
  // Return a wrapper function that provides safe execution
  return function safeCallbackWrapper(...args) {
    // Check if callback is actually a function
    if (typeof callback !== 'function') {
      if (!silent) {
        // Log non-function callback warning
        logError(
          createError(
            `Non-function callback received (${typeof callback})`,
            ErrorTypes.CALLBACK,
            { 
              callbackType: typeof callback,
              context,
              args: args.length > 0 ? `${args.length} arguments` : 'no arguments'
            }
          ),
          {
            severity: ErrorSeverity.WARNING,
            context: `callback_type_${context}`
          }
        );
      }

      // Return fallback if provided
      if ('fallback' in options) {
        return typeof options.fallback === 'function' 
          ? options.fallback(...args) 
          : options.fallback;
      }
      
      return undefined;
    }
    
    // If it is a function, safely execute it
    try {
      return thisArg 
        ? callback.apply(thisArg, args) 
        : callback(...args);
    } catch (error) {
      // Log callback execution errors
      logError(
        createError(
          `Error in callback execution: ${error.message}`,
          ErrorTypes.CALLBACK,
          { originalError: error, context, args: args.length }
        ),
        {
          severity: ErrorSeverity.ERROR,
          context: `callback_execution_${context}`
        }
      );
      
      // Return fallback if provided for error cases
      if ('fallback' in options) {
        return typeof options.fallback === 'function' 
          ? options.fallback(...args) 
          : options.fallback;
      }
      
      return undefined;
    }
  };
}

/**
 * Safely executes a callback function immediately with given arguments.
 * 
 * This is a convenience function that creates and immediately calls a safe callback.
 * 
 * @param {Function|any} callback - The callback to safely execute
 * @param {Array} args - Arguments to pass to the callback
 * @param {Object} options - Options for the safe callback (@see safeCallback)
 * @returns {any} The result of the callback or fallback value
 */
export function safeExecute(callback, args = [], options = {}) {
  return safeCallback(callback, options)(...args);
}

/**
 * Creates a wrapper for Chrome's sendMessage callback pattern
 * 
 * This specifically handles the Chrome messaging callback pattern, which includes
 * checking chrome.runtime.lastError and other messaging-specific concerns.
 * 
 * @param {Function|any} callback - The callback to safely execute
 * @param {Object} options - Options (@see safeCallback)
 * @returns {Function} A safe wrapper function for Chrome messaging
 */
export function safeChromeCallback(callback, options = {}) {
  const context = options.context || 'chrome_messaging';
  const fullOptions = { ...options, context };
  
  // Create a specialized wrapper for Chrome callbacks
  return function safeChromeCallbackWrapper(response) {
    // Check for Chrome runtime errors first
    if (chrome?.runtime?.lastError) {
      // Log Chrome runtime error
      const chromeError = chrome.runtime.lastError;
      logError(
        createError(
          `Chrome runtime error: ${chromeError.message}`,
          ErrorTypes.RUNTIME,
          { 
            originalError: chromeError,
            context
          }
        ),
        {
          severity: ErrorSeverity.ERROR,
          context: `chrome_runtime_${context}`
        }
      );
      
      // If there's a runtime error but we have a callback, call it with an error object
      if (typeof callback === 'function') {
        try {
          // Format a standardized error response
          const errorResponse = {
            status: 'error',
            error: {
              message: chromeError.message,
              type: 'runtime'
            },
            // Default fallback data to prevent further errors
            btcPrice: 50000,
            satPrice: 0.0005,
            timestamp: Date.now(),
            source: 'runtime_error'
          };
          
          return callback(errorResponse);
        } catch (callbackError) {
          // If the callback itself throws, log and continue
          logError(
            createError(
              `Error in chrome callback error handler: ${callbackError.message}`,
              ErrorTypes.CALLBACK,
              { originalError: callbackError, context }
            ),
            {
              severity: ErrorSeverity.ERROR,
              context: `chrome_callback_error_${context}`
            }
          );
        }
      }
      
      // Return fallback if provided
      if ('fallback' in options) {
        return typeof options.fallback === 'function'
          ? options.fallback(response)
          : options.fallback;
      }
      
      return undefined;
    }
    
    // If no runtime error, proceed with normal safe callback execution
    return safeCallback(callback, fullOptions)(response);
  };
}