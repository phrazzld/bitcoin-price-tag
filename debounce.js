/**
 * Debouncing utilities for Bitcoin Price Tag extension
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param {Function} func - The function to debounce
 * @param {number} wait - Milliseconds to wait before invoking
 * @param {Object} options - Configuration options
 * @param {boolean} [options.leading=false] - Call immediately on first invocation
 * @param {boolean} [options.trailing=true] - Call after wait period
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait, options = {}) {
  const { leading = false, trailing = true } = options;
  let timeout;
  let lastArgs;
  let lastThis;
  let result;
  let lastCallTime;

  // Function to invoke the original function
  function invokeFunc() {
    result = func.apply(lastThis, lastArgs);
    lastArgs = lastThis = null;
    return result;
  }

  // Check if we should invoke
  function shouldInvoke(time) {
    return lastCallTime === undefined || time - lastCallTime >= wait;
  }

  // Handle the trailing edge
  function trailingEdge() {
    timeout = null;
    if (trailing && lastArgs) {
      return invokeFunc();
    }
    lastArgs = lastThis = null;
    return result;
  }

  // The debounced function
  function debounced(...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeout === undefined) {
        // For leading edge
        if (leading) {
          result = invokeFunc();
        }
      }
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(trailingEdge, wait);
      return result;
    }

    if (timeout === undefined) {
      timeout = setTimeout(trailingEdge, wait);
    }
    return result;
  }

  // Method to cancel delayed invocations
  debounced.cancel = function () {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
    lastArgs = lastThis = lastCallTime = timeout = undefined;
  };

  // Method to flush the function and invoke immediately
  debounced.flush = function () {
    if (timeout !== undefined) {
      clearTimeout(timeout);
      timeout = undefined;
      if (lastArgs) {
        return invokeFunc();
      }
    }
    return result;
  };

  return debounced;
}

/**
 * Creates a throttled function that only invokes func at most once per wait milliseconds.
 * Throttling differs from debouncing in that it guarantees execution at regular intervals,
 * rather than after a period of inactivity.
 *
 * @param {Function} func - The function to throttle
 * @param {number} wait - Milliseconds to wait between invocations
 * @param {Object} options - Configuration options
 * @param {boolean} [options.leading=true] - Call on the leading edge of the timeout
 * @param {boolean} [options.trailing=true] - Call on the trailing edge of the timeout
 * @returns {Function} - Throttled function
 */
export function throttle(func, wait, options = {}) {
  const { leading = true, trailing = true } = options;
  let timeout;
  let lastArgs;
  let lastThis;
  let result;
  let lastCallTime = 0;

  // Function to invoke the original function
  function invokeFunc() {
    const time = Date.now();
    lastCallTime = time;
    result = func.apply(lastThis, lastArgs);
    lastArgs = lastThis = null;
    return result;
  }

  // Handle the trailing edge
  function trailingEdge() {
    timeout = null;
    if (trailing && lastArgs) {
      return invokeFunc();
    }
    lastArgs = lastThis = null;
    return result;
  }

  // The throttled function
  function throttled(...args) {
    const time = Date.now();
    const isFirstCall = lastCallTime === 0;
    const timeSinceLastCall = time - lastCallTime;
    const waitTime = Math.max(0, wait - timeSinceLastCall);

    lastArgs = args;
    lastThis = this;

    // If this is the first call or enough time has passed since the last call
    if (isFirstCall || timeSinceLastCall >= wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      if (leading || !isFirstCall) {
        return invokeFunc();
      }
    }

    // Set up trailing edge call if it doesn't exist and is enabled
    if (!timeout && trailing) {
      timeout = setTimeout(trailingEdge, waitTime);
    }

    return result;
  }

  // Method to cancel delayed invocations
  throttled.cancel = function () {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
    lastArgs = lastThis = timeout = undefined;
    lastCallTime = 0;
  };

  // Method to flush the function and invoke immediately
  throttled.flush = function () {
    if (timeout !== undefined) {
      clearTimeout(timeout);
      timeout = undefined;
      if (lastArgs) {
        return invokeFunc();
      }
    }
    return result;
  };

  return throttled;
}

/**
 * Coalesces multiple similar requests into a single operation.
 * This is useful for handling requests from multiple tabs or components
 * that need the same data, reducing redundant processing.
 *
 * @param {Function} func - The function to coalesce
 * @param {Function} keyExtractor - Function to extract key from arguments
 * @param {number} wait - Milliseconds to wait for coalescing
 * @returns {Function} - Coalesced function
 */
export function coalesce(func, keyExtractor, wait) {
  const pending = new Map();

  return function (...args) {
    const key = keyExtractor(...args);

    if (pending.has(key)) {
      const { promise, resolvers } = pending.get(key);
      // Add this resolver to the existing request
      const newPromise = new Promise((resolve) => {
        resolvers.push(resolve);
      });
      return newPromise;
    }

    const resolvers = [];
    const promise = new Promise((resolve) => {
      resolvers.push(resolve);
    });

    pending.set(key, { promise, resolvers });

    // After the wait period, execute the function
    setTimeout(() => {
      const { resolvers } = pending.get(key);
      func(...args)
        .then((result) => {
          // Resolve all promises waiting for this result
          resolvers.forEach((resolver) => resolver(result));
          pending.delete(key);
        })
        .catch((error) => {
          // Reject all promises with the error
          resolvers.forEach((resolver) => resolver(Promise.reject(error)));
          pending.delete(key);
        });
    }, wait);

    return promise;
  };
}

/**
 * Creates a batch processor that collects items over a period and then processes them in a batch
 *
 * @param {Function} processor - Function that processes the batch
 * @param {number} wait - Milliseconds to wait before processing
 * @param {number} [maxBatchSize=Infinity] - Maximum batch size
 * @returns {Function} - Function to add items to the batch
 */
export function batchProcessor(processor, wait, maxBatchSize = Infinity) {
  let batch = [];
  let timeout = null;

  // Process the current batch
  const processBatch = () => {
    const currentBatch = [...batch];
    batch = [];
    timeout = null;
    return processor(currentBatch);
  };

  // The batching function
  function addToBatch(item) {
    batch.push(item);

    // Process immediately if we hit max batch size
    if (batch.length >= maxBatchSize) {
      if (timeout) {
        clearTimeout(timeout);
      }
      return processBatch();
    }

    // Set timeout for processing if not already set
    if (!timeout) {
      timeout = setTimeout(processBatch, wait);
    }

    return Promise.resolve();
  }

  // Method to flush the batch immediately
  addToBatch.flush = function () {
    if (batch.length > 0) {
      if (timeout) {
        clearTimeout(timeout);
      }
      return processBatch();
    }
    return Promise.resolve();
  };

  // Method to cancel the batch
  addToBatch.cancel = function () {
    batch = [];
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return addToBatch;
}
