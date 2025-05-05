# Chrome Extension Manifest V3 Key Notes

## Content Security Policy

1. **Stricter Default CSP in Manifest V3**:

   - Manifest V3 uses a much stricter default Content Security Policy than V2
   - `unsafe-eval` and `unsafe-inline` are no longer allowed by default
   - The CSP directive in our manifest correctly follows V3 requirements: `"extension_pages": "script-src 'self'; object-src 'self'"`

2. **No Inline Scripts**:
   - Our previous approach using inline scripts in content-script.js was correctly identified as problematic
   - The current solution using an external script file aligns with best practices

## Content Scripts

1. **Execution Environment**:

   - Content scripts execute in an "isolated world" - they share the DOM but not JavaScript context with page scripts
   - Our approach using `document.createElement('script')` to inject scripts into the page context is a standard pattern

2. **Module Loading**:

   - Content scripts cannot directly use ES modules in all scenarios
   - Our two-tier approach (non-module content script injecting a module script) follows best practices

3. **Chrome Methods in Injected Scripts**:
   - Scripts injected into the page context cannot access Chrome extension APIs directly
   - Our design correctly keeps Chrome API usage in the content script, not in injected scripts

## Web Accessible Resources

1. **Resource Access**:

   - In Manifest V3, web_accessible_resources requires explicitly defined `matches` patterns
   - Our manifest correctly includes all required JS files and uses `"matches": ["<all_urls>"]`

2. **URL Access**:
   - Using `chrome.runtime.getURL()` to get the correct URL for extension resources is the correct approach
   - This ensures proper resource loading across different browsers and contexts

## Best Practices Confirmed in Our Implementation

1. **External Scripts Instead of Inline**:

   - Using bootstrap-module.js as an external file instead of inline content aligns with CSP requirements
   - This avoids the need for unsafe-inline directives

2. **Proper Resource Declaration**:

   - All scripts that need to be accessible are properly declared in web_accessible_resources

3. **Clean Separation of Concerns**:
   - Content script (extension context) handles injection
   - Bootstrap module (page context) handles initialization
   - Module system (page context) handles the actual functionality

## Potential Improvements to Consider

1. **Scripting API**:

   - For more complex scenarios, the chrome.scripting API could be considered as an alternative
   - Would require adding the "scripting" permission

2. **Error Handling**:

   - Current error handling improvements align well with debugging needs
   - Consider adding more specific error messages related to resource loading failures

3. **Performance**:
   - The current approach with multiple small modules is flexible but could impact load time
   - Consider bundling for production builds if performance becomes an issue

Overall, our current implementation follows Chrome's Manifest V3 guidelines and best practices for content script module loading and CSP compliance.
