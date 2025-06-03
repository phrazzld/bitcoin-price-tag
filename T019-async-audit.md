# T019: Async Error Handling Audit

## Summary

This document provides a comprehensive audit of all async/await and Promise usage in the codebase to identify and fix potential unhandled promise rejections.

## Files Analyzed

1. `src/content-script/messaging.ts` - ✅ GOOD
2. `src/content-script/index.ts` - ❌ ISSUES FOUND
3. `src/service-worker/api.ts` - ✅ GOOD
4. `src/service-worker/cache.ts` - ✅ GOOD
5. `src/service-worker/index.ts` - ❌ ISSUES FOUND

## Issues Found

### Critical Issues (Unhandled Promise Rejections)

#### 1. `src/content-script/index.ts` Lines 102, 111
**Problem**: `initPriceAnnotation()` is called without await or error handling
```typescript
// Current problematic code:
initPriceAnnotation(); // Line 102
initPriceAnnotation(); // Line 111
```

**Impact**: If `initPriceAnnotation()` throws an error, it will result in an unhandled promise rejection.

**Fix**: Wrap calls in proper error handling:
```typescript
initPriceAnnotation().catch(error => {
  logger.error('Failed to initialize price annotation', error, {
    function_name: 'initialize'
  });
});
```

#### 2. `src/service-worker/index.ts` Lines 270-273
**Problem**: Async event handlers registered without error handling wrapper
```typescript
// Current problematic code:
chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onStartup.addListener(handleStartup);
chrome.alarms.onAlarm.addListener(handleAlarm);
```

**Impact**: If any of these async handlers throw unhandled errors, they could cause promise rejections.

**Fix**: Wrap handlers with error catching:
```typescript
chrome.runtime.onInstalled.addListener((details) => {
  handleInstalled(details).catch(error => {
    logger.error('Unhandled error in onInstalled handler', error);
  });
});
```

### Well-Handled Async Code

#### ✅ `src/content-script/messaging.ts`
- Proper Promise construction with resolve/reject
- Timeout handling
- Chrome API error checking
- Type validation

#### ✅ `src/service-worker/api.ts`
- Comprehensive try/catch blocks
- Retry logic with exponential backoff
- Proper error classification and re-throwing
- Structured error logging

#### ✅ `src/service-worker/cache.ts`
- All async functions have proper try/catch
- Errors are properly logged and re-thrown where appropriate
- Silent failures where appropriate (e.g., rehydrateCache)

#### ✅ `src/content-script/index.ts` (initPriceAnnotation function itself)
- Proper try/catch block around async operations
- Graceful error handling with logging
- Silent failure approach for user experience

## Recommendations

### 1. Immediate Fixes Required
- Fix the unhandled promise rejections in content-script/index.ts
- Wrap service worker event handlers with error catching

### 2. Error Handling Standards
- All async function calls should have proper error handling
- Event handlers for Chrome APIs should be wrapped with error catching
- Use the new typed error classes from T018 for better error categorization

### 3. Testing Improvements
- Add unhandled promise rejection monitoring to tests
- Create test cases for error scenarios in async operations

## Implementation Plan

1. **Fix Critical Issues**: Address the unhandled promise rejections
2. **Add Error Monitoring**: Implement unhandled rejection tracking
3. **Update Error Types**: Replace generic Error objects with typed errors from T018
4. **Add Tests**: Create tests for error scenarios

## Verification

After fixes:
1. Run tests with unhandled rejection monitoring
2. Test error scenarios manually
3. Check browser console for unhandled promise rejections
4. Verify all async operations have proper error handling