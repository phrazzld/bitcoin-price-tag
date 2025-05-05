# Content Security Policy (CSP) Investigation

## Problem Statement

We're encountering a Content Security Policy error when trying to load the Bitcoin Price Tag extension:

```
Refused to execute inline script because it violates the following Content Security Policy directive:
"script-src 'self' 'wasm-unsafe-eval' 'inline-speculation-rules' http://localhost:* http://127.0.0.1:* chrome-extension://9f54f670-b5b9-4251-8c58-de47276a56db/".
Either the 'unsafe-inline' keyword, a hash ('sha256-EpXWVFq58lg9RwoDwKVseYreaGX+7tRiApJxJUQc/eA='), or a nonce ('nonce-...') is required to enable inline execution.
```

This error occurs because our current implementation in `content-script.js` creates a script element with inline content, but the CSP doesn't allow inline scripts without the appropriate hash, nonce, or 'unsafe-inline' directive.

## Current Approaches Tried

### Approach 1: Two-Tier Architecture with Inline Script Injection

**Implementation:**

- Non-module content-script.js that loads first
- Dynamically creates a script element with inline module content
- Appends this to the page to execute

**Issues:**

- CSP blocks inline script execution
- Cannot use 'unsafe-inline' in Manifest V3
- Hash or nonce solutions are complex in extension context

### Approach 2: Absolute Import Paths

**Implementation:**

- Modified import statements to use absolute paths (e.g., `/conversion.js` instead of `./conversion.js`)
- Updated manifest.json to include appropriate web_accessible_resources

**Issues:**

- Doesn't address the fundamental module loading issue

## Possible Solutions

### Solution 1: External Script Reference Instead of Inline Content

**Approach:**

- Modify content-script.js to create a script element that references an external file instead of inline content
- Create a small "bootstrap" module file that imports the main module and executes it

**Pros:**

- Avoids inline script execution entirely
- Doesn't require CSP modifications
- Simple implementation

**Cons:**

- Requires an extra file
- Might add slight performance overhead with an additional network request

### Solution 2: Use Programmatic Injection via chrome.scripting API

**Approach:**

- Use chrome.scripting.executeScript API to inject modules
- Request "scripting" permission in manifest.json

**Pros:**

- More reliable injection method recommended for Manifest V3
- Bypasses many CSP issues

**Cons:**

- Requires additional permissions
- Limited to specific contexts
- More complex implementation

### Solution 3: Add CSP Hash to Manifest

**Approach:**

- Calculate the SHA-256 hash of the inline script
- Add this hash to the content_security_policy in manifest.json

**Pros:**

- Allows the specific inline script to execute
- Doesn't require restructuring the code

**Cons:**

- Hash must be updated when script changes
- Limited flexibility
- Potential maintenance burden

### Solution 4: Use a Web Worker to Load the Module

**Approach:**

- Create a web worker from an external file
- Load the module within the worker
- Communicate with the main script via messaging

**Pros:**

- Avoids CSP issues with inline scripts
- Can improve performance by offloading work

**Cons:**

- More complex architecture
- Additional messaging overhead
- Potential limitations in DOM access

### Solution 5: Browser Extension Page Approach with Messaging

**Approach:**

- Create an extension page (background script or other extension page)
- Have the content script communicate with this page via messaging

**Pros:**

- Clearly separates extension context from page context
- Avoids injection issues entirely

**Cons:**

- Significant architecture change
- More complex messaging
- Potential performance overhead

## Recommended Solution: External Script Reference

After analyzing all options, I recommend Solution 1: replacing inline script content with an external script reference. This is the simplest approach that directly addresses the CSP issue without requiring additional permissions or complex architecture changes.

### Implementation Plan:

1. Create a small bootstrap module file (e.g., `bootstrap-module.js`) that imports the main module and executes it
2. Modify content-script.js to create a script element with src attribute pointing to this bootstrap file
3. Update manifest.json to include this bootstrap file in web_accessible_resources
4. Remove any inline script content from content-script.js

This solution avoids CSP issues entirely while maintaining the module architecture we've established.
