# Remediation Plan – Sprint <N>

## Executive Summary
This plan addresses critical and high-severity issues identified in the code review, prioritizing the restoration of test suite reliability and core functionality coverage. Key actions include fixing ineffective log assertions by correctly mocking the logger interface, un-skipping vital tests, standardizing timer mocks, and improving overall code hygiene and clarity. This structured approach will ensure a more robust and maintainable codebase.

## Strike List
| Seq | CR‑ID | Title                                                          | Effort | Owner?   |
|-----|-------|----------------------------------------------------------------|--------|----------|
| 1   | cr-03 | Fix: Violation of Stated Logging Strategy (Mock Logger)        | M      | `<Owner>` |
| 2   | cr-01 | Fix: Test Log Assertions Ineffective                           | S      | `<Owner>` |
| 3   | cr-02 | Fix: Critical Test Case Skipped (Cached Price)                 | S      | `<Owner>` |
| 4   | cr-04 | Fix: Inconsistent and Unreliable Timer Mocking Strategy        | M      | `<Owner>` |
| 5   | cr-05 | Fix: Confusing Maintenance of Legacy and Unused Files          | S      | `<Owner>` |
| 6   | cr-06 | Fix: Gaps in CoinGecko API Error Handling Test Coverage      | M      | `<Owner>` |
| 7   | cr-07 | Docs: Add TSDoc for Exported Mock Helpers                    | XS     | `<Owner>` |
| 8   | cr-08 | Clarity: Shorten Redundant Comment in `constants.ts`           | XS     | `<Owner>` |
| 9   | cr-09 | Hygiene: Review `source` Field in `PriceData` Mocks            | XS     | `<Owner>` |

## Detailed Remedies

### cr-03 Fix: Violation of Stated Logging Strategy (Mock Logger)
- **Problem:** Tests in `src/service-worker/index.test.ts` mock the global `console` object instead of the project's `Logger` interface, violating the stated logging strategy and hindering proper structured log verification.
- **Impact:** Leads to brittle, implementation-coupled tests and is a root cause for ineffective log assertions (cr-01), undermining test reliability for logging.
- **Chosen Fix:** Refactor tests to mock the `Logger` interface from `src/shared/logger.ts`, injecting it or making it mockable, and asserting against its methods.
- **Steps:**
  1.  Review `src/shared/logger.ts`. If the `Logger` class or `createLogger` function is not easily mockable (e.g., global instance), refactor it to support dependency injection or allow providing a mock console/output stream during instantiation in a test environment.
  2.  Update `src/service-worker/index.test.ts` (and any other relevant test files) to mock the `Logger` interface (or the `createLogger` factory from `src/shared/logger.ts`).
  3.  Ensure the service worker code (or modules it uses that log) receives/uses an instance of this mocked logger. This might involve refactoring the service worker to accept a logger instance if it currently instantiates it directly.
  4.  Replace `vi.spyOn(console, 'log')` and `vi.spyOn(console, 'error')` with spies on the methods of the mocked `Logger` instance (e.g., `mockLogger.info`, `mockLogger.error`).
- **Done‑When:**
    *   `console` is no longer mocked directly for logging tests in `src/service-worker/index.test.ts`.
    *   Tests utilize a mock of the `Logger` interface/implementation from `src/shared/logger.ts`.
    *   Tests can access and assert the structured objects passed to the mock logger's methods.

### cr-01 Fix: Test Log Assertions Ineffective
- **Problem:** The `expectLogToContain` helper function in `src/service-worker/index.test.ts` uses `expect(true).toBe(true)`, performing no actual validation of log content.
- **Impact:** Renders tests relying on it useless for log verification, potentially masking critical logging errors, incorrect structured log formats, or missing messages, severely undermining test suite reliability.
- **Chosen Fix:** Implement actual assertion logic within `expectLogToContain` (or replace it) to inspect calls made to the mocked `Logger` methods (established in cr-03).
- **Steps:**
  1.  Modify the `expectLogToContain` helper function. It should now operate on the mock calls captured by the mocked `Logger` methods (e.g., `mockLogger.info.mock.calls`).
  2.  Assert that the mock logger method was called as expected (e.g., `expect(mockLogger.info.mock.calls.length).toBeGreaterThan(0)`).
  3.  Retrieve the arguments of the relevant log call. The first argument should be the structured log object.
  4.  Perform assertions on this structured log object. Example: `const logContent = mockLogger.info.mock.calls[0][0]; expect(logContent.message).toContain('Expected substring'); expect(logContent.someKey).toBe('expectedValue');`.
  5.  Update all call sites of `expectLogToContain` to align with the new approach, providing expected structured log data for comparison.
- **Done‑When:**
    *   `expectLogToContain` (or its replacement) correctly validates specific log messages and structured log properties against the mock logger.
    *   Tests relying on log verification provide meaningful assertions and fail if log output is incorrect.
    *   The `expect(true).toBe(true)` pattern is eliminated from log assertion helpers.

### cr-02 Fix: Critical Test Case Skipped (Cached Price)
- **Problem:** The test "should return cached price when available" in `src/service-worker/index.test.ts` is skipped, leaving core cache functionality untested.
- **Impact:** A significant gap in test coverage for critical service worker logic related to performance and API rate limit management. The justification in `TODO.md` is incorrect.
- **Chosen Fix:** Un-skip the test and ensure it passes robustly by addressing any underlying issues, likely related to the now-fixed logging/mocking or complexities with `sendResponse`.
- **Steps:**
  1.  Remove `.skip` from the "should return cached price when available" test in `src/service-worker/index.test.ts`.
  2.  Address any dependencies on logging or timer mocks, leveraging the fixes from cr-03, cr-01, and cr-04.
  3.  Ensure `chrome.storage.local.get` (for cache reads) and `chrome.storage.local.set` (for cache writes) are correctly mocked (e.g., using `vi.spyOn(chrome.storage.local, 'get').mockResolvedValue(...)`) and their state is managed for the test.
  4.  Verify that the `sendResponse` callback (passed to the message listener) is correctly spied upon and its arguments (which should include the cached price data) are asserted.
  5.  Ensure the test verifies that an actual API call (`fetch`) is *not* made when data is successfully served from the cache.
  6.  Fix any logic errors in the test or the system under test that prevent the test from passing.
- **Done‑When:**
    *   The test "should return cached price when available" is un-skipped.
    *   The test robustly verifies that cached price data is returned correctly and that no API call is made when a cache hit occurs.
    *   The test passes reliably in the CI pipeline.

### cr-04 Fix: Inconsistent and Unreliable Timer Mocking Strategy
- **Problem:** The codebase uses a mix of `vi.useFakeTimers()`, `vi.advanceTimersByTimeAsync()`, direct `vi.spyOn(global, 'setTimeout')`, and manual `await new Promise(resolve => setTimeout(resolve, N))` for timer control.
- **Impact:** This inconsistency makes tests harder to understand, maintain, and can lead to flakiness or excessive test durations. Explicit high timeouts are often a symptom.
- **Chosen Fix:** Standardize on `vi.useFakeTimers()` for all tests involving `setTimeout` or `setInterval`. Use `vi.advanceTimersByTimeAsync()` or `vi.runAllTimersAsync()` to deterministically control time.
- **Steps:**
  1.  For all affected test files (`src/service-worker/api.test.ts`, `src/service-worker/index.test.ts`, `tests/integration/messaging.integration.test.ts`):
      *   Call `vi.useFakeTimers()` in `beforeEach` or at the beginning of relevant test suites/blocks.
      *   Call `vi.useRealTimers()` in `afterEach` if fake timers are enabled per-block, or ensure proper reset.
  2.  Replace manual `setTimeout` waits (e.g., `await new Promise(resolve => setTimeout(resolve, N))`) with `await vi.advanceTimersByTimeAsync(N)` or `await vi.runAllTimersAsync()`.
  3.  Eliminate `vi.spyOn(global, 'setTimeout')` used to force immediate callback execution if fake timer controls can achieve the same in a more controlled manner.
  4.  Ensure promises involved in timed operations are properly chained and awaited in conjunction with timer advancements.
  5.  Review and reduce explicit test timeouts (e.g., `it('...', { timeout: 10000 })`) once asynchronous handling is reliable and deterministic.
- **Done‑When:**
    *   All tests involving timers consistently use `vi.useFakeTimers()` and its associated control functions.
    *   Manual `setTimeout` waits for promise resolution and direct `setTimeout` spies are eliminated.
    *   Tests involving timers are deterministic and run efficiently.

### cr-05 Fix: Confusing Maintenance of Legacy and Unused Files
- **Problem:** Legacy Manifest V2 files (`content.js`, root `manifest.json`) are being modified with functional changes beyond simple API endpoint updates, despite being marked as unused, causing confusion.
- **Impact:** Wasted development effort, inaccurate historical reference, and potential for confusion regarding the active project structure.
- **Chosen Fix:** Isolate genuinely legacy/reference-only files into a dedicated directory and revert non-essential functional changes to `content.js` to maintain its value as an accurate V2 reference.
- **Steps:**
  1.  Create a dedicated `archive/manifest-v2/` directory (or similar, e.g., `legacy/v2/`) in the project root.
  2.  Move the root `content.js` and root `manifest.json` (the V2 versions) into this new directory.
  3.  For the archived `content.js`: Review the changes made to `valueInFriendlyUnits`. Revert complex functional changes not directly related to updating API endpoint/parsing logic for CoinGecko "consistency." The aim is for the file to reflect its original V2 functional state as accurately as possible, with minimal changes for API provider reference.
  4.  Update comments within the archived files (or add a `README.md` in the archive directory) to clearly state their legacy Manifest V2 status, that they are not used in the current build, and their purpose (historical reference).
- **Done‑When:**
    *   Legacy V2 `content.js` and `manifest.json` are moved to a dedicated archive directory.
    *   Unnecessary functional changes in the archived `content.js` are reverted.
    *   The status and purpose of these archived files are clearly documented.

### cr-06 Fix: Gaps in CoinGecko API Error Handling Test Coverage
- **Problem:** `src/service-worker/api.test.ts` may not comprehensively test `fetchBtcPrice` against all relevant CoinGecko API error types, including different malformed JSON responses and specific error payloads.
- **Impact:** Potential unhandled errors from the external API could lead to unexpected behavior or failures in production, particularly around retry logic.
- **Chosen Fix:** Review CoinGecko API documentation and enhance `src/service-worker/api.test.ts` with explicit test cases for various HTTP status codes, malformed/empty responses, and ensure retry logic is tested against appropriate error conditions.
- **Steps:**
  1.  Consult the CoinGecko API documentation to identify common error responses, status codes, and potential error payload structures.
  2.  In `src/service-worker/api.test.ts`, add or enhance test cases for `fetchBtcPrice` to cover:
      *   HTTP status codes that should be handled distinctively (e.g., retrying on 429/5xx, failing fast on 400/401/403/404).
      *   Malformed, empty, or unexpected JSON responses from the API.
      *   Network errors (e.g., simulating `fetch` itself throwing an error).
  3.  Ensure that the retry logic (number of attempts, backoff delays if applicable) is explicitly tested against appropriate error conditions (e.g., 429, 5xx) and *not* triggered for non-retryable errors.
  4.  Utilize and potentially extend mock helpers in `tests/mocks/fetch.ts` (like `mockCoinGeckoError`) to accurately simulate these diverse error scenarios.
- **Done‑When:**
    *   `src/service-worker/api.test.ts` includes comprehensive tests for CoinGecko API error handling.
    *   Tests cover various HTTP status codes, different JSON response issues, and network errors.
    *   Retry logic behavior is explicitly verified for both retryable and non-retryable errors.

