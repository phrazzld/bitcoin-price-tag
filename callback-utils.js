/**
 * Callback Utilities for Bitcoin Price Tag
 *
 * Provides utilities for safely handling callbacks, especially for asynchronous operations
 * and Chrome messaging that might otherwise cause crashes.
 *
 * Enhanced with context-aware error logging.
 */

import { ErrorTypes, ErrorSeverity, logError, createError, logDecision } from './error-handling.js';
import { getCorrelationId, getLightContext, addTiming } from './context-provider.js';

/**
 * Creates a wrapper function that safely executes a callback
 *
 * This utility helps prevent issues where callbacks:
 * - Are not actually functions (null, undefined, or other types)
 * - Throw unexpected errors during execution
 * - Need to pass through specific context
 *
 * Enhanced with detailed context tracking and performance metrics.
 *
 * @param {Function|any} callback - The callback to safely execute (may not be a function)
 * @param {Object} options - Options for the safe callback
 * @param {string} [options.context='unknown'] - Context name for error reporting
 * @param {boolean} [options.silent=false] - Whether to suppress console warnings
 * @param {Function|any} [options.fallback] - Fallback function or value to use if callback isn't valid
 * @param {Object} [options.thisArg] - 'this' context to bind to the callback
 * @param {boolean} [options.trackTiming=false] - Whether to track timing of callback execution
 * @param {boolean} [options.enrichContext=true] - Whether to automatically add page context to errors
 * @returns {Function} A safe wrapper function
 */
export function safeCallback(callback, options = {}) {
  // Default options
  const context = options.context || 'unknown';
  const silent = options.silent || false;
  const thisArg = options.thisArg;
  const trackTiming = options.trackTiming || false;
  const enrichContext = options.enrichContext !== false;

  // Create a correlation ID for tracking this callback instance
  const callbackId = `cb_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;

  // Return a wrapper function that provides safe execution
  return function safeCallbackWrapper(...args) {
    // Start timing if tracking is enabled
    const startTime = trackTiming ? Date.now() : null;

    // Track the correlation ID for this execution
    const correlationId = getCorrelationId();

    // Check if callback is actually a function
    if (typeof callback !== 'function') {
      if (!silent) {
        // Get lightweight context for error enrichment
        let contextData = {};
        if (enrichContext) {
          try {
            contextData = getLightContext();
          } catch (contextError) {
            // Ignore context gathering errors
          }
        }

        // Create detailed error information
        const errorDetails = {
          callbackType: typeof callback,
          context,
          callbackId,
          correlationId,
          args: args.length > 0 ? `${args.length} arguments` : 'no arguments',
          ...(enrichContext ? { page: contextData } : {}),
        };

        // Log decision instead of error for expected non-function cases
        if (callback === undefined && options.allowUndefined) {
          logDecision(
            'skip_callback',
            'callback_undefined',
            context,
            errorDetails,
            ErrorSeverity.DEBUG,
          );
        } else {
          // Log non-function callback warning
          logError(
            createError(
              `Non-function callback received (${typeof callback})`,
              ErrorTypes.CALLBACK,
              errorDetails,
            ),
            {
              severity: ErrorSeverity.WARNING,
              context: `callback_type_${context}`,
              skipContextEnrichment: enrichContext, // Skip if we've already enriched
            },
          );
        }
      }

      // Return fallback if provided
      if ('fallback' in options) {
        // Start timing fallback if tracking is enabled
        const fallbackStartTime = trackTiming ? Date.now() : null;

        try {
          const result =
            typeof options.fallback === 'function' ? options.fallback(...args) : options.fallback;

          // Add timing information for fallback if tracking is enabled
          if (trackTiming && fallbackStartTime) {
            const fallbackTime = Date.now() - fallbackStartTime;
            if (!silent && fallbackTime > 50) {
              // Only log slow fallbacks
              console.debug(
                `Bitcoin Price Tag: Fallback execution time: ${fallbackTime}ms for ${context}`,
              );
            }
          }

          return result;
        } catch (fallbackError) {
          // Log fallback execution errors
          logError(
            createError(
              `Error in fallback execution: ${fallbackError.message}`,
              ErrorTypes.CALLBACK,
              {
                originalError: fallbackError,
                context,
                callbackId,
                correlationId,
                args: args.length,
                isFallback: true,
              },
            ),
            {
              severity: ErrorSeverity.ERROR,
              context: `fallback_execution_${context}`,
            },
          );

          return undefined;
        }
      }

      return undefined;
    }

    // If it is a function, safely execute it
    try {
      const result = thisArg ? callback.apply(thisArg, args) : callback(...args);

      // Add timing information if tracking is enabled
      if (trackTiming && startTime) {
        const executionTime = Date.now() - startTime;
        if (!silent && executionTime > 100) {
          // Only log slow callbacks
          console.debug(
            `Bitcoin Price Tag: Callback execution time: ${executionTime}ms for ${context}`,
          );
        }
      }

      return result;
    } catch (error) {
      // Get lightweight context for error enrichment
      let contextData = {};
      if (enrichContext) {
        try {
          contextData = getLightContext();
        } catch (contextError) {
          // Ignore context gathering errors
        }
      }

      // Create detailed error information
      const errorDetails = {
        originalError: error,
        context,
        callbackId,
        correlationId,
        args: args.length,
        ...(trackTiming && startTime ? { executionTime: Date.now() - startTime } : {}),
        ...(enrichContext ? { page: contextData } : {}),
      };

      // Log callback execution errors
      logError(
        createError(
          `Error in callback execution: ${error.message}`,
          ErrorTypes.CALLBACK,
          errorDetails,
        ),
        {
          severity: ErrorSeverity.ERROR,
          context: `callback_execution_${context}`,
          skipContextEnrichment: enrichContext, // Skip if we've already enriched
        },
      );

      // Return fallback if provided for error cases
      if ('fallback' in options) {
        // Start timing fallback if tracking is enabled
        const fallbackStartTime = trackTiming ? Date.now() : null;

        try {
          const result =
            typeof options.fallback === 'function' ? options.fallback(...args) : options.fallback;

          // Add timing information for fallback if tracking is enabled
          if (trackTiming && fallbackStartTime) {
            const fallbackTime = Date.now() - fallbackStartTime;
            if (!silent && fallbackTime > 50) {
              // Only log slow fallbacks
              console.debug(
                `Bitcoin Price Tag: Fallback execution time: ${fallbackTime}ms for ${context}`,
              );
            }
          }

          return result;
        } catch (fallbackError) {
          // Log fallback execution errors
          logError(
            createError(
              `Error in fallback execution after callback error: ${fallbackError.message}`,
              ErrorTypes.CALLBACK,
              {
                originalError: fallbackError,
                context,
                callbackId,
                correlationId,
                args: args.length,
                isFallback: true,
                originalCallbackError: error.message,
              },
            ),
            {
              severity: ErrorSeverity.ERROR,
              context: `fallback_execution_${context}`,
            },
          );

          return undefined;
        }
      }

      return undefined;
    }
  };
}

/**
 * Safely executes a callback function immediately with given arguments.
 *
 * This is a convenience function that creates and immediately calls a safe callback.
 * Enhanced with timing and context tracking.
 *
 * @param {Function|any} callback - The callback to safely execute
 * @param {Array} args - Arguments to pass to the callback
 * @param {Object} options - Options for the safe callback (@see safeCallback)
 * @returns {any} The result of the callback or fallback value
 */
export function safeExecute(callback, args = [], options = {}) {
  // Always track timing for direct executions
  const enrichedOptions = {
    ...options,
    trackTiming: options.trackTiming !== false,
    context: options.context || 'direct_execute',
  };

  return safeCallback(callback, enrichedOptions)(...args);
}

/**
 * Creates a wrapper for Chrome's sendMessage callback pattern
 *
 * This specifically handles the Chrome messaging callback pattern, which includes
 * checking chrome.runtime.lastError and other messaging-specific concerns.
 *
 * Enhanced with more detailed context and error recovery options.
 *
 * @param {Function|any} callback - The callback to safely execute
 * @param {Object} options - Options (@see safeCallback)
 * @param {boolean} [options.trackChromeErrors=true] - Whether to track Chrome runtime errors
 * @param {boolean} [options.provideFallbackData=true] - Whether to include fallback data in error responses
 * @returns {Function} A safe wrapper function for Chrome messaging
 */
export function safeChromeCallback(callback, options = {}) {
  const context = options.context || 'chrome_messaging';
  const trackChromeErrors = options.trackChromeErrors !== false;
  const provideFallbackData = options.provideFallbackData !== false;
  const fullOptions = { ...options, context, trackTiming: true };

  // Create correlation ID for this chrome callback instance
  const chromeCallbackId = `ccb_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;

  // Create a specialized wrapper for Chrome callbacks
  return function safeChromeCallbackWrapper(response) {
    // Start timing
    const startTime = Date.now();

    // Get current correlation ID
    const correlationId = getCorrelationId();

    // Check for Chrome runtime errors first
    if (chrome?.runtime?.lastError) {
      // Get the Chrome error
      const chromeError = chrome.runtime.lastError;

      // Get lightweight context for error enrichment
      let contextData = {};
      try {
        contextData = getLightContext();
      } catch (contextError) {
        // Ignore context gathering errors
      }

      // Create detailed error context
      const errorDetails = {
        originalError: chromeError,
        context,
        chromeCallbackId,
        correlationId,
        handlingTime: Date.now() - startTime,
        page: contextData,
        responseReceived: response ? true : false,
        responseType: response ? typeof response : 'none',
      };

      // Log Chrome runtime error with enhanced context
      if (trackChromeErrors) {
        logError(
          createError(
            `Chrome runtime error: ${chromeError.message}`,
            ErrorTypes.RUNTIME,
            errorDetails,
          ),
          {
            severity: ErrorSeverity.ERROR,
            context: `chrome_runtime_${context}`,
            skipContextEnrichment: true, // We've already enriched
          },
        );
      }

      // If there's a runtime error but we have a callback, call it with an error object
      if (typeof callback === 'function') {
        try {
          // Format a standardized error response with context info
          const errorResponse = {
            status: 'error',
            error: {
              message: chromeError.message,
              type: 'runtime',
              correlationId,
              chromeCallbackId,
              timestamp: Date.now(),
            },
          };

          // Add fallback data if enabled
          if (provideFallbackData) {
            errorResponse.btcPrice = 50000;
            errorResponse.satPrice = 0.0005;
            errorResponse.timestamp = Date.now();
            errorResponse.source = 'runtime_error';
            errorResponse.isFallback = true;
          }

          return callback(errorResponse);
        } catch (callbackError) {
          // If the callback itself throws, log and continue with enhanced context
          logError(
            createError(
              `Error in chrome callback error handler: ${callbackError.message}`,
              ErrorTypes.CALLBACK,
              {
                originalError: callbackError,
                chromeError: chromeError.message,
                context,
                chromeCallbackId,
                correlationId,
                handlingTime: Date.now() - startTime,
              },
            ),
            {
              severity: ErrorSeverity.ERROR,
              context: `chrome_callback_error_${context}`,
            },
          );
        }
      }

      // Return fallback if provided
      if ('fallback' in options) {
        try {
          return typeof options.fallback === 'function'
            ? options.fallback(response)
            : options.fallback;
        } catch (fallbackError) {
          // Log fallback execution errors
          logError(
            createError(
              `Error in chrome fallback execution: ${fallbackError.message}`,
              ErrorTypes.CALLBACK,
              {
                originalError: fallbackError,
                chromeError: chromeError.message,
                context,
                chromeCallbackId,
                correlationId,
                isFallback: true,
              },
            ),
            {
              severity: ErrorSeverity.ERROR,
              context: `chrome_fallback_execution_${context}`,
            },
          );

          return undefined;
        }
      }

      return undefined;
    }

    // If response is obviously invalid, log a warning
    if (response === null || response === undefined) {
      // Only log if not silent
      if (!options.silent) {
        logError(
          createError(
            `Chrome messaging received ${response === null ? 'null' : 'undefined'} response`,
            ErrorTypes.VALIDATION,
            {
              context,
              chromeCallbackId,
              correlationId,
              handlingTime: Date.now() - startTime,
            },
          ),
          {
            severity: ErrorSeverity.WARNING,
            context: `chrome_invalid_response_${context}`,
          },
        );
      }
    } else if (response && response.status === 'error' && response.error) {
      // Handle error responses from the background script
      // This is different from chrome.runtime.lastError, as it's an application-level error

      // Log the background script error
      logError(
        createError(
          `Background script error: ${response.error.message || 'Unknown error'}`,
          response.error.type || ErrorTypes.UNKNOWN,
          {
            originalError: response.error,
            context,
            chromeCallbackId,
            correlationId,
            handlingTime: Date.now() - startTime,
            response,
          },
        ),
        {
          severity: ErrorSeverity.WARNING,
          context: `background_error_${context}`,
        },
      );
    }

    // If no runtime error, proceed with normal safe callback execution
    // Add timing information to the options
    const timingOptions = {
      ...fullOptions,
      callStartTime: startTime,
      chromeCallbackId,
    };

    return safeCallback(callback, timingOptions)(response);
  };
}
