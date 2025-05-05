# Bitcoin Price Tag Extension Architecture

## Overview

The Bitcoin Price Tag extension is designed to scan web pages for price information and convert those prices to their Bitcoin equivalent. The extension operates in various page contexts (including Amazon and other e-commerce sites) and must handle a wide range of scenarios gracefully, including restricted environments.

This document outlines the extension's architecture with a focus on robustness, error handling, and fallback mechanisms.

## Core Architecture Components

### 1. Content Script (`content-script.js`)

The content script is the first component to load in a web page. It:

- Creates the messaging bridge that facilitates communication between page context and extension context
- Detects the execution environment and adapts extension behavior accordingly
- Injects the bootstrap module appropriately based on detected environment
- Provides fallback mechanisms for restricted contexts
- Handles message passing between contexts
- Implements safe callback patterns and error recovery

### 2. Bootstrap Module (`bootstrap-module.js`)

A lightweight entry point that:

- Imports and initializes the main content module
- Provides top-level error handling

### 3. Content Module (`content-module.js`)

The main functionality module that:

- Initializes the Bitcoin Price Tag functionality
- Retrieves Bitcoin price data via the messaging bridge
- Manages price data caching
- Configures and initializes DOM scanning

### 4. DOM Scanner (`dom-scanner.js`)

Specialized module for DOM traversal and price detection:

- Efficiently walks the DOM tree to find price elements
- Handles special cases like Amazon's complex price structure
- Applies Bitcoin conversion to identified prices
- Contains specialized context detection for iframes
- Implements optimized lazy-loading via IntersectionObserver

### 5. Error Handling (`error-handling.js`)

Comprehensive error management system:

- Categorizes errors by type and severity
- Provides consistent logging patterns
- Implements recovery mechanisms
- Controls log verbosity based on context

### 6. Background Script (`background.js`)

Service worker that:

- Fetches Bitcoin price data from external APIs
- Manages pricing data caching
- Handles scheduled refreshes via alarms
- Responds to messages from content scripts

## Fail-Safe Design Pattern

The extension implements a multi-tier fail-safe design:

### Tier 1: Normal Operation

- Full extension functionality with extension API access
- Real-time price data fetching
- Complete DOM scanning and conversion

### Tier 2: Degraded Operation

- Limited functionality when some APIs are unavailable
- Use of cached price data
- Selective DOM scanning based on context

### Tier 3: Minimal Operation

- Basic functionality in restricted environments (cross-origin iframes)
- Emergency fallback price data
- Limited or no DOM scanning

### Tier 4: No Operation

- Graceful shutdown in impossible environments
- No errors exposed to user
- Minimal console output

## Error Handling Strategy

The extension follows these principles for error management:

1. **Predict failures**: Each function anticipates how it might fail and has appropriate handling
2. **Isolate errors**: Errors are caught and handled at the appropriate level, preventing cascading failures
3. **Provide fallbacks**: Every critical operation has a fallback mechanism
4. **Context awareness**: Error handling adapts based on the execution context
5. **Minimal noise**: Production logging is kept to a minimum, focusing on actionable issues

## Safe Callback Pattern

To avoid "callback is not a function" errors and other callback issues:

```javascript
// Safe callback executor
safeCallback: (callback, data, context = 'unknown') => {
  // Safety check
  if (typeof callback !== 'function') {
    console.debug(
      `Bitcoin Price Tag: Non-function callback detected in ${context}, using fallback`,
    );
    return; // Just return without executing anything
  }

  try {
    callback(data);
  } catch (error) {
    console.debug(`Bitcoin Price Tag: Error executing callback in ${context}`, {
      error: error.message,
    });
    // We don't throw errors from callbacks - just log and continue
  }
};
```

## Context Detection System

The extension actively detects its execution environment to adapt behavior:

```javascript
isExtensionContextAvailable: () => {
  try {
    const hasChrome = typeof chrome !== 'undefined';
    const hasRuntime = hasChrome && typeof chrome.runtime !== 'undefined';
    const hasSendMessage = hasRuntime && typeof chrome.runtime.sendMessage === 'function';

    // Check if we're in an iframe with restrictions
    let isRestricted = false;
    try {
      const parentOrigin = window.parent.location.origin;
      const currentOrigin = window.location.origin;
      isRestricted = parentOrigin !== currentOrigin;
    } catch (e) {
      isRestricted = true; // If we can't access parent, we're restricted
    }

    return {
      available: hasSendMessage,
      hasChrome,
      hasRuntime,
      hasSendMessage,
      isRestricted,
      isIframe: window !== window.top,
      mode: isRestricted ? 'restricted' : hasSendMessage ? 'full' : 'fallback',
    };
  } catch (e) {
    return {
      available: false,
      mode: 'error',
      error: e.message,
    };
  }
};
```

## Fallback Mechanisms

The extension implements a complete chain of fallbacks:

1. **API Fallbacks**: When extension APIs are unavailable

   - Falls back to cached data
   - Falls back to emergency data if cache is unavailable

2. **DOM Access Fallbacks**: When DOM access is restricted

   - Detects restricted contexts and adjusts scanning behavior
   - Skips processing in cross-origin iframes

3. **Module Loading Fallbacks**: When module loading fails

   - Attempts alternative loading methods
   - Provides minimal functionality when full modules can't load

4. **Error Recovery**: When errors occur during operation
   - Handles errors at appropriate level
   - Continues operation where possible
   - Degrades gracefully when necessary

## Performance Optimizations

The extension includes various performance optimizations:

1. **Targeted Scanning**: First scans only likely price elements before full DOM traversal
2. **WeakSet Usage**: Uses WeakSet for processed node tracking to avoid memory leaks
3. **Non-recursive DOM Walk**: Uses a stack-based approach instead of recursion for DOM traversal
4. **Lazy Loading**: Uses IntersectionObserver to process off-screen elements only when they become visible
5. **Throttled Processing**: Applies throttling and debouncing to avoid CPU spikes
6. **Minimal Logging**: Reduces console output in production environments

## Special Case: Amazon Pages

Amazon presents unique challenges due to:

1. Complex iframe structure with cross-origin restrictions
2. Uniquely structured price components spread across multiple DOM elements
3. Dynamic content loading and frequent DOM changes

The extension handles Amazon using:

1. **Specialized Amazon Price Detection**: Custom logic to find and process Amazon price containers
2. **Component Extraction**: Extracts and combines price components from Amazon's fragmented price structure
3. **Context Detection**: Detects Amazon iframe contexts and adjusts behavior accordingly
4. **Restricted Operation Mode**: Falls back to minimal functionality in restricted Amazon iframes
