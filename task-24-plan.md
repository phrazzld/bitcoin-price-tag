# Task 24: Add Debouncing for Price Updates

## Overview
This task involves implementing debouncing mechanisms for price updates to prevent excessive API calls, DOM updates, and other operations that could impact performance. Debouncing ensures that rapidly repeated events are handled only once after a certain delay period, reducing unnecessary processing and resource usage.

## Current State Analysis
Currently, the extension:
1. Fetches price data on initialization and via periodic updates (every 5 minutes)
2. Updates DOM elements when price data changes
3. Observes DOM for changes and processes new elements
4. Responds to various events and user interactions

However, there's no debouncing mechanism to:
- Prevent rapid-fire API calls when multiple tabs request prices simultaneously
- Limit DOM updates when price changes are very frequent
- Control how often the DOM is re-scanned after mutations

## Implementation Approach

### 1. Create a Debouncing Utility Module
Create a new file `debounce.js` that will contain:
- A generic debounce function that can be used across the extension
- Specialized debouncing utilities for different use cases (leading/trailing, immediate execution, etc.)
- Throttling functions for cases where a regular minimum interval is more appropriate

### 2. Apply Debouncing to Price Updates
In `background.js`:
- Debounce the `fetchAndStoreBitcoinPrice` function to prevent multiple simultaneous requests
- Implement request coalescing to handle concurrent requests from multiple tabs
- Add a cooldown period after failed API requests to prevent rapid retry attempts

### 3. Debounce DOM Processing
In `content.js` and `dom-scanner.js`:
- Debounce the DOM scanning and price insertion operations
- Add throttling to MutationObserver callback to prevent excessive processing during rapid DOM changes
- Implement a batching mechanism for processing multiple detected prices at once

### 4. Add Request Queuing
- Implement a request queue for price updates from different parts of the extension
- Prioritize user-initiated refreshes over automatic background updates
- Merge duplicate requests to reduce processing overhead

### 5. Add User Interaction Debouncing
- Add throttling for user-initiated price refresh requests
- Include visual feedback for when updates are being debounced/throttled

## Technical Details

### 1. Debounce Function Implementation
```javascript
/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * @param {Function} func - The function to debounce
 * @param {number} wait - Milliseconds to wait before invoking
 * @param {Object} options - Configuration options
 * @param {boolean} [options.leading=false] - Call immediately on first invocation
 * @param {boolean} [options.trailing=true] - Call after wait period
 * @returns {Function} - Debounced function
 */
function debounce(func, wait, options = {}) {
  const { leading = false, trailing = true } = options;
  let timeout;
  let lastArgs;
  let lastThis;
  let result;
  let lastCallTime;
  
  function invokeFunc() {
    result = func.apply(lastThis, lastArgs);
    lastArgs = lastThis = null;
    return result;
  }
  
  function shouldInvoke(time) {
    return lastCallTime === undefined || 
           (time - lastCallTime >= wait);
  }
  
  function trailingEdge() {
    timeout = null;
    if (trailing && lastArgs) {
      return invokeFunc();
    }
    lastArgs = lastThis = null;
    return result;
  }
  
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
  
  return debounced;
}
```

### 2. Throttle Function Implementation
```javascript
/**
 * Creates a throttled function that only invokes func at most once per wait milliseconds
 * @param {Function} func - The function to throttle
 * @param {number} wait - Milliseconds to wait between invocations
 * @param {Object} options - Configuration options
 * @param {boolean} [options.leading=true] - Call on the leading edge of the timeout
 * @param {boolean} [options.trailing=true] - Call on the trailing edge of the timeout
 * @returns {Function} - Throttled function
 */
function throttle(func, wait, options = {}) {
  const { leading = true, trailing = true } = options;
  return debounce(func, wait, {
    leading,
    trailing,
    maxWait: wait
  });
}
```

### 3. Request Coalescing Implementation
```javascript
/**
 * Coalesces multiple similar requests into a single operation
 * @param {Function} func - The function to coalesce
 * @param {Function} keyExtractor - Function to extract key from arguments
 * @param {number} wait - Milliseconds to wait for coalescing
 * @returns {Function} - Coalesced function
 */
function coalesce(func, keyExtractor, wait) {
  const pending = new Map();
  
  return function(...args) {
    const key = keyExtractor(...args);
    
    if (pending.has(key)) {
      const { promise, resolver } = pending.get(key);
      // Add this call to existing request
      return promise;
    }
    
    let resolver;
    const promise = new Promise((resolve) => {
      resolver = resolve;
    });
    
    pending.set(key, { promise, resolver });
    
    // After the wait period, execute the function
    setTimeout(() => {
      const result = func(...args);
      resolver(result);
      pending.delete(key);
    }, wait);
    
    return promise;
  };
}
```

## Implementation Plan
1. Create `debounce.js` with core debouncing utilities
2. Update `background.js` to debounce price update requests
3. Update `content.js` and `dom-scanner.js` to debounce DOM operations
4. Update mutation observers to use throttling for better performance
5. Add request coalescing for multi-tab scenarios
6. Add unit tests for the debouncing functions
7. Test in various scenarios including high-frequency updates and heavy DOM changes

## Testing Plan
1. Unit tests for debounce and throttle functions
2. Integration tests for debounced price updates
3. Performance tests comparing debounced vs. non-debounced operations
4. Tests for concurrent tab scenarios