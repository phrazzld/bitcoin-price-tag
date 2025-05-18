## Chosen Approach

A comprehensive integration testing strategy for service worker (SW) <-> content script (CS) communication in a Chrome extension, using Vitest and respecting the strict no-mocking-internal-collaborators policy by mocking only the Chrome APIs.

## Rationale

1. **Simplicity (✔):** Directly tests message passing between SW and CS without complex setups, using focused test cases.
2. **Modularity (✔):** Tests are structured to reflect the extension's architecture, with clear separation between SW and CS tests.
3. **Testability (✔):** Achieves testability by mocking only external boundaries (Chrome APIs), avoiding internal mocks.
4. **Coding Standards (✔):** Adheres to TypeScript best practices and the project's coding standards.
5. **Docs Approach (✔):** Includes TSDoc comments and follows the project's documentation strategy.

## Build Steps

1. **Set Up Test Environment:**
   - Install Vitest and related testing utilities (`@vitest/spy`, `happy-dom`).
   - Configure Vitest with `testEnvironment: 'happy-dom'` to simulate the browser environment.
   - Set up `tsconfig.test.json` to include `"dom"` in `lib` for browser API support.

2. **Mock Chrome APIs:**
   - Create a `__mocks__/chrome.ts` file to mock `chrome.runtime.sendMessage`, `chrome.runtime.onMessage.addListener`, and `chrome.runtime.onMessage.removeListener`.
   - Use Vitest spies to control and verify the behavior of these mocked functions.

3. **Write Integration Tests:**
   - Test SW receiving messages from CS:
     - Simulate a message from CS using the mocked `chrome.runtime.onMessage` listener.
     - Verify SW handles the message correctly and responds via `sendResponse`.
   - Test CS receiving messages from SW:
     - Simulate a message from SW using the mocked `chrome.runtime.sendMessage`.
     - Verify CS handles the message correctly.
   - Test error handling and edge cases (e.g., SW not responding, CS handling errors).

4. **Structure Test Files:**
   - Place SW tests in `src/service-worker/index.test.ts`.
   - Place CS tests in `src/content-script/messaging.test.ts`.
   - Use `describe` blocks to group tests by functionality (e.g., price updates, error handling).

5. **Implement Test Utilities:**
   - Create helper functions to simulate message passing (`simulateMessageFromCS`, `simulateMessageFromSW`).
   - Implement a `waitForMessage` utility to handle asynchronous message responses.

6. **Ensure Test Coverage:**
   - Aim for >80% coverage of the message passing logic.
   - Use Vitest's coverage reporting (`--coverage`) to track progress.

7. **Integrate with CI:**
   - Add a CI step to run Vitest with coverage checks (`vitest run --coverage`).
   - Enforce coverage thresholds in `vitest.config.ts`.

8. **Document Tests:**
   - Include TSDoc comments for test suites and complex test cases.
   - Document the purpose of each test and expected outcomes.

9. **Address Technical Challenges:**
   - Use `vi.useFakeTimers` to control timeouts in asynchronous tests.
   - Ensure test isolation by resetting mocks and spies between tests (`vi.resetAllMocks`).

10. **Verify Success Metrics:**
    - Ensure all tests pass (`vitest run`).
    - Confirm coverage meets >80% for message passing logic.
    - Check that test execution time is reasonable (e.g., < 1 minute for all tests).