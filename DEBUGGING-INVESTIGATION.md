# Bitcoin Price Tag Extension Debugging Investigation

## Current Errors (2025-05-04)

The extension is showing multiple error types:

1. **"callback is not a function"** errors in content-module.js
2. **"Chrome runtime API not available"** errors
3. **"processedNodes.clear is not a function"** errors
4. **Using emergency fallback data** warnings

## Error Analysis

### Error Type 1: "callback is not a function"
- Location: Multiple occurrences at content-module.js
- Error appears in different lines (450:34, 482:35, 493:34)
- This suggests issues with asynchronous callbacks or function references

### Error Type 2: "Chrome runtime API not available"
- Location: content-module.js
- This indicates the module script cannot access Chrome APIs
- Expected behavior: Chrome APIs should be accessible in content scripts but not in injected scripts

### Error Type 3: "processedNodes.clear is not a function"
- Location: Specifically in dom-scanner.js, line 372 in initScanning function
- Error appears with varying severity (warning, error, critical)
- **Found**: processedNodes is defined as a WeakSet, which does not have a clear() method

### Error Type 4: Using emergency fallback data
- Not an error but a consequence of the API fetch failures
- System falling back to emergency_fallback price data

## Initial Hypotheses

1. **Module Context Issue**: The script injection approach may not be properly initializing modules
2. **Chrome API Context**: Trying to access Chrome APIs from the wrong context
3. **DOM Element Access**: WeakSet or other collections not properly initialized
4. **Script Load Order**: Dependencies might be loading in the wrong order

## Investigation Progress

### Issue 1: WeakSet.clear() Problem (Confirmed)

Examining the code revealed:

1. In `dom-scanner.js` line 22, processedNodes is defined as: 
   ```javascript
   const processedNodes = new WeakSet();
   ```

2. In the initScanning function (line 372), it attempts to call:
   ```javascript
   processedNodes.clear();
   ```

3. This is causing the error because **WeakSet doesn't have a clear() method** in JavaScript.

4. This method is called when initializing scanning at line 372, leading to the failure.

5. Critical errors occur in this call chain:
   - content-module.js initialization → initScanning call → processedNodes.clear()

### Issue 2: Chrome Runtime API Unavailability (Under Investigation)

The error "Chrome runtime API not available" indicates:

1. The injected module script cannot access chrome.* APIs
2. This is expected behavior since injected scripts run in the page context
3. Any chrome.* API calls need to be made in the content script and their results passed to the module

### Issue 3: Callback is not a function (Related to Above)

Based on error patterns, this appears related to:
1. Failed Chrome API calls 
2. Promises or callbacks that fail to resolve correctly after the earlier errors

## Attempted Solutions

### Solution 1: Fix CSP issues with external script loading
- **Changes**: Replaced inline script with external bootstrap-module.js
- **Result**: CSP errors resolved but new function-related errors appeared
- **Status**: Partially successful

## Planned Fixes

### Fix 1: Replace processedNodes.clear() with proper WeakSet handling

Since WeakSet doesn't have a clear() method, we need to either:
1. Replace WeakSet with a standard Set (which has a clear() method)
2. Create a new WeakSet instance instead of trying to clear the existing one
3. Implement a custom clear mechanism

### Fix 2: Proper context separation for Chrome APIs

Ensure Chrome APIs are only called from the content script, not from injected modules.

## Next Steps

1. Implement fix for the WeakSet.clear() issue
2. Identify and fix any Chrome API calls made from the wrong context
3. Test the fixes in combination to ensure they resolve all errors

## Updates (2025-05-04)

### Update 1: WeakSet clear() issue
Found the root cause of the most critical error: processedNodes.clear() called on a WeakSet that doesn't have this method. This explains the cascade of errors including the "processedNodes.clear is not a function" messages. 

**Solution implemented**: Changed the approach to create a new WeakSet instance instead of trying to clear the existing one.

### Update 2: Chrome API usage from page context
Identified another major issue - the content-module.js file directly uses Chrome APIs (chrome.runtime.sendMessage) but is being executed in the page context where these APIs are not available.

**Found problematic code in content-module.js**:
1. Direct checks for chrome.runtime.sendMessage availability
2. Direct calls to chrome.runtime.sendMessage for fetching Bitcoin price
3. Additional chrome.runtime.sendMessage calls for background refresh

**Solution implemented**: Messaging bridge between page context and extension context:
1. Added a global object `window.bitcoinPriceTagBridge` in the content script
2. This bridge exposes methods for sending messages to the background script
3. Updated content-module.js to use this bridge instead of direct Chrome API calls
4. Added fallback mechanisms when the bridge is not available

### Update 3: Implementation details

**Bridge implementation in content-script.js**:
```javascript
window.bitcoinPriceTagBridge = {
  sendMessageToBackground: (message, callback) => {
    // This runs in the content script context where Chrome APIs are available
    chrome.runtime.sendMessage(message, (response) => {
      // Handle errors and forward the response
      callback(response);
    });
  },
  isExtensionContextAvailable: () => true
};
```

**Content module updates**:
1. Changed Chrome API checks to bridge availability checks
2. Replaced direct chrome.runtime.sendMessage calls with bridge method calls
3. Added proper error handling for bridge communication

We've now addressed the two major issues:
1. The WeakSet.clear() error (by creating a new WeakSet instance)
2. The Chrome API availability (by implementing a messaging bridge)

These changes should resolve the errors showing in the console.