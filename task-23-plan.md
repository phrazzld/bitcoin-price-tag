# Task 23: Implement Caching for Bitcoin Price

## Overview
This task involves implementing a comprehensive caching mechanism for Bitcoin price data to reduce API calls, minimize network usage, and improve the performance and reliability of the extension.

## Current State Analysis
The extension currently has:
1. Basic caching in `background.js` using Chrome storage API
2. Additional local caching in `content.js` using localStorage
3. A fallback system with multiple layers (primary API → alternative APIs → cache → emergency data)
4. Cache age checking but limited cache control

## Improvement Goals
1. Implement a more comprehensive caching strategy with:
   - Improved cache persistence
   - Proper cache invalidation and refresh strategies 
   - Smarter refresh policies based on price volatility
   - Efficient cache access patterns
   - Support for offline mode
   - Cache-first approach with background refresh

2. Reduce API calls by:
   - Using stale-while-revalidate pattern
   - Implementing cache expiration headers
   - Sharing cache between tabs/instances when possible

3. Improve UX by:
   - Displaying cached data immediately while refreshing in background
   - Adding cache status indicators 
   - Providing manual refresh options

## Implementation Approach

### 1. Create a dedicated cache module
Create a new file `cache-manager.js` that will encapsulate all caching logic, including:
- Reading/writing to both chrome.storage and localStorage
- Cache validation and freshness checks
- Cache prefetching and background refreshing
- Handling cache expiration

### 2. Define cache levels and strategies
Implement a tiered caching approach:
- **Memory cache**: In-memory cache for fastest access (session-based)
- **Storage cache**: Chrome storage for persistence between browser sessions
- **Local cache**: localStorage as additional fallback
- **IndexedDB cache**: For storing historical price data if needed

### 3. Implement cache control mechanisms
- Add cache timestamps, TTL, and version information
- Implement efficient cache invalidation rules
- Create cache status monitoring

### 4. Add background refresh pattern
- Show cached data immediately to user
- Refresh data in background if cache is stale
- Update UI without disrupting user experience

### 5. Optimize for offline usage
- Detect offline status and adjust strategy
- Provide appropriate UI indicators when using offline cache

### 6. Add unit tests
- Test cache hit/miss scenarios
- Test cache expiration and refresh
- Test offline behavior

## Technical Details

### Cache Structure
```javascript
{
  data: {
    btcPrice: number,
    satPrice: number,
    timestamp: number,
    source: string
  },
  metadata: {
    version: string,
    created: number,
    expires: number,
    lastRefreshed: number,
    refreshCount: number,
    volatility: number // measure of recent price changes
  }
}
```

### Cache Refresh Logic
1. If cache is fresh (< 5 minutes old), use it immediately
2. If cache is stale but not expired (5 minutes to 24 hours old):
   - Return cached data immediately
   - Trigger background refresh
3. If cache is expired (> 24 hours old):
   - Attempt to fetch fresh data
   - Fall back to cache if fetch fails

### Browser Compatibility
Ensure the cache implementation works across different browsers by:
- Testing with different storage APIs
- Using appropriate polyfills when needed
- Handling browser-specific storage limits

## Test Plan
1. Unit tests for cache manager functions
2. Integration tests for cache behavior with APIs
3. Mock tests for offline scenarios
4. Performance tests to measure improvement