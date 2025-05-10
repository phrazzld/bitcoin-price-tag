```
/Users/phaedrus/Development/bitcoin-price-tag/test/unit
```

This directory contains unit tests for the Bitcoin Price Tag browser extension. The purpose of these tests is to ensure the correctness and reliability of individual modules within the extension. The tests are written using Vitest, a JavaScript testing framework.

**Architecture:**

The directory follows a modular structure, with each test file focusing on a specific module or utility function. This allows for focused and independent testing of individual components. The tests primarily focus on isolated units of code, mocking external dependencies (like `chrome.storage`) to control the testing environment and avoid reliance on external systems.

**Key File Roles:**

- `cache-manager.test.js`: Tests the utilities related to caching price data, including determining cache freshness, calculating cache TTL, calculating price volatility, and deciding when to refresh the cache.

- `conversion.test.js`: Tests the functions responsible for converting fiat currency values to Bitcoin (BTC) and Satoshis (sats), including pattern matching for currency symbols, extracting numeric values, and generating user-friendly snippets.

- `debounce.test.js`: Tests the debouncing and throttling utilities used to optimize performance by limiting the frequency of function calls. It includes tests for `debounce`, `throttle`, `coalesce`, and `batchProcessor` functions.

- `error-handling.test.js`: Tests the error handling utilities, including error categorization, error creation, and timeout management.

- `fallback-mechanisms.test.js`: Tests the fallback mechanisms implemented to ensure the extension continues to function even when external data sources are unavailable or when errors occur. Tests include retry and timeout logic, local storage caching, and emergency fallback data creation.

- `cache-integration.test.js`: Tests the integration of the caching system with the `background.js` script, verifying that data is correctly stored and retrieved from various cache sources (chrome storage, local storage, memory), and that cache freshness and offline mode are handled appropriately.

**Important Dependencies and Gotchas:**

- **Vitest:** The tests rely on Vitest for test execution, assertions, and mocking.
- **Mocking:** Extensive use of mocking is employed to isolate units of code and control external dependencies. In particular, `chrome.storage.local` and `localStorage` are frequently mocked. These mocks require careful setup and teardown to avoid interference between tests.
- **Timers:** The `debounce.test.js` file relies on mocking timers using `vi.useFakeTimers()` to test time-dependent functions accurately. It's important to advance timers appropriately using `vi.advanceTimersByTime()` to simulate the passage of time.
- **Asynchronous Operations:** Many tests involve asynchronous operations (e.g., Promises). It's crucial to handle these operations correctly using `async/await` and ensuring that promises are resolved before assertions are made.
- **Global Scope:** Some tests modify the global scope (e.g., `navigator.onLine`). It's important to restore the original values after each test to prevent side effects.
- **Chrome API:** The tests are designed to run in a Node.js environment and therefore mock the Chrome extension APIs (e.g. `chrome.storage`). This means they do not directly test the behavior of the extension within the Chrome browser environment, but rather the logic of the JavaScript code that interacts with those APIs.

```

```
