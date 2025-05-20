# Todo

## Remediation Tasks - Code Review Findings

This todo list addresses critical and high-severity issues identified in the code review, focusing on improving test reliability, error handling, and code quality. Tasks are ordered by priority.

## Critical Test Framework Issues

- [x] **CR-03 · Fix · P0: Refactor tests to use mock Logger instead of console**
    - **Context:** Tests in `src/service-worker/index.test.ts` mock the global `console` object instead of the project's `Logger` interface, violating the project's logging strategy.
    - **Action:**
        1. Review and potentially refactor `src/shared/logger.ts` to support dependency injection or mock replacement in tests
        2. Update `src/service-worker/index.test.ts` to mock the `Logger` interface instead of `console`
        3. Ensure all tested code receives/uses instances of the mocked logger
        4. Replace all `vi.spyOn(console, ...)` calls with spies on the mock logger methods
    - **Done‑when:**
        1. `console` is no longer mocked directly for logging tests
        2. Tests utilize a proper mock of the `Logger` interface
        3. Tests can access and assert the structured objects passed to the logger
    - **Results:**
        1. Added a `LoggerOutputAdapter` interface to `logger.ts` to enable dependency injection of output methods
        2. Modified `Logger` to accept an optional output adapter in its constructor
        3. Updated `createLogger` function to support passing the output adapter
        4. Replaced direct console mocking in tests with structured log capture
        5. Improved the `expectLogToContain` helper to parse JSON logs and verify message contents
        6. Fixed 20 of 21 tests to use the new approach; skipped one test for future work (CR-02)
    - **Depends‑on:** none

- [x] **CR-01 · Fix · P0: Implement effective log assertion logic in tests**
    - **Context:** The `expectLogToContain` helper in `src/service-worker/index.test.ts` uses `expect(true).toBe(true)`, performing no actual validation.
    - **Action:**
        1. Modify `expectLogToContain` to inspect mock calls captured by mocked `Logger` methods
        2. Implement proper assertions to verify log message content and structured data
        3. Replace the meaningless `expect(true).toBe(true)` pattern with actual assertions
        4. Update all callsites of the helper to align with the new approach
    - **Done‑when:**
        1. The helper correctly validates log messages and structured log properties
        2. Tests provide meaningful assertions and fail when log output is incorrect
        3. No instances of `expect(true).toBe(true)` remain in log assertion helpers
    - **Results:**
        1. Enhanced the `findLogWithMessage` function to provide better error messages with available logs
        2. Improved `expectLogToContain` with robust validation of log structure, context, and error details
        3. Added proper type checking for log entries and improved error handling
        4. Confirmed tests now fail appropriately when log assertions are incorrect
        5. Added additional validation for array indexes and empty log collections
    - **Depends‑on:** CR-03

- [ ] **CR-02 · Fix · P0: Un-skip critical cached price test**
    - **Context:** A core test "should return cached price when available" in `src/service-worker/index.test.ts` is skipped, leaving cache functionality untested.
    - **Action:**
        1. Remove `.skip` from the test
        2. Address any dependencies on logging or timer mocks
        3. Ensure Chrome storage APIs are correctly mocked
        4. Verify that the `sendResponse` callback is properly spied upon and assertions are valid
        5. Add verification that no API call is made when data is served from cache
    - **Done‑when:**
        1. The test is no longer skipped
        2. It passes reliably in the CI pipeline
        3. It properly verifies cached price behavior without making API calls
    - **Depends‑on:** CR-03, CR-01, CR-04

- [ ] **CR-04 · Fix · P1: Standardize timer mocking strategy across tests**
    - **Context:** The codebase uses inconsistent approaches to timer mocking, leading to maintenance issues and flaky tests.
    - **Action:**
        1. Add `vi.useFakeTimers()` in `beforeEach` hooks for test files dealing with timers
        2. Add `vi.useRealTimers()` in `afterEach` hooks to restore timer behavior
        3. Replace manual `setTimeout` waits with `vi.advanceTimersByTimeAsync()` or `vi.runAllTimersAsync()`
        4. Eliminate direct spies on `setTimeout` where possible
        5. Review and reduce excessive test timeouts
    - **Done‑when:**
        1. All tests consistently use the same timer mocking approach
        2. No manual `setTimeout` promise waits remain in tests
        3. Tests involving timers are deterministic and reliable
    - **Depends‑on:** none

## File Organization & Documentation

- [ ] **CR-05 · Refactor · P1: Organize legacy Manifest V2 files**
    - **Context:** Legacy Manifest V2 files (`content.js`, root `manifest.json`) are being actively modified despite being functionally unused.
    - **Action:**
        1. Create a dedicated `archive/manifest-v2/` directory
        2. Move `content.js` and root `manifest.json` into this directory
        3. Revert non-essential functional changes to `content.js` (especially `valueInFriendlyUnits`)
        4. Add clear documentation about the purpose of these archived files
    - **Done‑when:**
        1. Legacy V2 files are moved to a dedicated directory
        2. Unnecessary functional changes are reverted
        3. Files are clearly documented as historical reference only
    - **Depends‑on:** none

- [ ] **CR-07 · Documentation · P2: Add TSDoc for exported mock helpers**
    - **Context:** Exported helper functions in mock files lack proper TSDoc comments, reducing discoverability and clarity.
    - **Action:**
        1. Add comprehensive TSDoc comments to all exported functions in `tests/mocks/fetch.ts`
        2. Include parameter descriptions, return value information, and usage examples
    - **Done‑when:**
        1. All exported mock helpers have proper TSDoc comments
        2. Documentation clearly explains the purpose and usage of each function
    - **Depends‑on:** none

## Testing & API Handling

- [x] **CR-06 · Test · P1: Enhance CoinGecko API error handling coverage**
    - **Context:** Current tests may not fully cover CoinGecko API error scenarios, risking unhandled errors in production.
    - **Action:**
        1. Review CoinGecko API documentation for error responses and status codes
        2. Add or enhance tests in `src/service-worker/api.test.ts` to cover:
           - Various HTTP status codes (429, 5xx for retry; 400, 401, 403, 404 for fail-fast)
           - Malformed, empty, or unexpected JSON responses
           - Network errors and timeout scenarios
        3. Verify retry logic for appropriate error conditions
    - **Done‑when:**
        1. Comprehensive tests cover all reasonable error scenarios
        2. Retry logic is verified for both retryable and non-retryable errors
        3. Test coverage for error handling increases significantly
    - **Results:**
        1. Added test for HTTP 504 Gateway Timeout to verify retry behavior
        2. Added test for completely incorrect response structure (totally different JSON schema)
        3. Added test for empty response body (null response)
        4. Added test for network timeout errors
        5. Added test for partial network failures (connection interrupted during response)
        6. Enhanced test for HTTP 429 rate limiting with multiple retries
        7. Improved assertions to verify proper logging of errors
        8. Added verification that the API correctly retries on appropriate errors
        9. Confirmed proper error code and message handling in all scenarios
    - **Depends‑on:** none

## Code Quality & Hygiene

- [ ] **CR-08 · Cleanup · P3: Shorten redundant comments in constants.ts**
    - **Context:** `constants.ts` contains overly verbose comments that add little value beyond what the code already expresses.
    - **Action:**
        1. Review comments in `src/common/constants.ts`
        2. Remove or shorten redundant comments that merely restate what the code already communicates
        3. Preserve comments that explain "why" rather than "what"
    - **Done‑when:**
        1. No redundant comments remain in `constants.ts`
        2. File is more concise while maintaining clarity
    - **Depends‑on:** none

- [ ] **CR-09 · Cleanup · P3: Review source field in PriceData mocks**
    - **Context:** The `source` field in `PriceData` mocks may need to be consistently updated to reflect CoinGecko.
    - **Action:**
        1. Search for all instances of `PriceData` creation in test files
        2. Ensure the `source` field consistently references 'CoinGecko' rather than 'CoinDesk'
    - **Done‑when:**
        1. All `PriceData` mocks consistently use 'CoinGecko' as the source
        2. No references to 'CoinDesk' remain in test data
    - **Depends‑on:** none

## Next Steps
After completing these remediation tasks, a follow-up code review should be conducted to verify all issues have been properly addressed and no regressions have been introduced.

## References
- The original remediation plan is available in the project files
- Issues are prioritized based on severity and impact on test reliability and code quality
- Tasks with P0 priority should be addressed first, followed by P1 and P2