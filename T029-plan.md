# T029: Write Unit Tests for cache.ts

## Objective
Create comprehensive unit tests for the cache.ts module to achieve >90% code coverage.

## Plan

1. **Analyze cache.ts functionality**
   - Review the implementation to understand all functions and edge cases
   - Identify the chrome.storage.local dependency that needs mocking

2. **Create test file structure**
   - Create src/service-worker/cache.test.ts
   - Import necessary testing utilities from vitest
   - Mock chrome.storage.local

3. **Test scenarios to implement**
   - getCachedPrice():
     - Returns valid cached data when present and not expired
     - Returns null when no data exists
     - Returns null when data is expired
     - Handles storage errors gracefully
     - Validates data structure correctly
   - setCachedPrice():
     - Correctly stores price data
     - Handles storage errors
     - Updates in-memory cache if applicable
   - TTL logic:
     - Correctly calculates expiration time
     - Identifies expired data accurately
   - Data validation:
     - Rejects invalid data structures
     - Handles corrupted data gracefully

4. **Approach**
   - Use vi.mock to mock chrome.storage.local
   - Test both success and failure paths
   - Ensure proper error handling
   - Verify TTL calculations with specific timestamps
   - Use beforeEach/afterEach for test isolation