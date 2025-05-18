```
## Chosen Approach
Test integration by spinning up real service worker and content script modules, mocking only the Chrome APIs at the boundary, and driving message flows via the actual messaging interfaces.

## Rationale
- Only Chrome APIs are mocked, strictly obeying the "no internal mocking" rule and preserving modularity.
- Simplicity: Real modules are loaded as in production, so tests reflect true integration/collaboration.
- Testability: Allows realistic, high-coverage tests of messaging, error propagation, and cache/API branching.
- Coding standards: Clean separation of test helpers, utilities, and test cases, following TypeScript and repo structure conventions.
- Documentation: Test code and helpers act as executable documentation of expected worker/script interactions.

## Build Steps
1. **Test Architecture Design**
   - Place integration test files under `src/integration/` or `src/service-worker/__integration__` and `src/content-script/__integration__` (or top-level `__tests__/integration/` if global).
   - Structure test suites per message-flow direction: content-script→service-worker and service-worker→content-script.
   - Import actual modules: `src/service-worker/index.ts` and `src/content-script/messaging.ts`, plus types from `src/common/types.ts`.
   - Do not mock or stub any internal functions or modules.

2. **Test Coverage Strategy**
   - Identify message types and flows: e.g., price request, cache hit/miss, API error, malformed message, unknown message type.
   - For each, write:
     - Happy path test (request, correct response)
     - Cache miss/fresh API result test
     - Error/timeout/invalid message test
     - Reverse direction test (worker-initiated messages, if any)
   - Ensure all message handler branches and error paths are exercised for >80% line/branch coverage.

3. **Implementation Details**
   - In test setup, mock global `chrome.runtime.sendMessage`, `chrome.runtime.onMessage.addListener`, and any other relevant Chrome runtime APIs using Vitest’s mocking utilities, but only at the global boundary.
   - Implement a fake Chrome runtime message bus in test helpers to simulate message passing between the "content script" and "service worker" in-process.
   - Load both modules, wire their message listeners to the fake bus, and drive test scenarios by sending messages as the content script would in production.
   - For cache/API state, inject test data by mocking Chrome storage APIs or by setting up known initial state via the allowed external API mocks.
   - Use async/await and Promises to ensure message passing is correctly sequenced and responses are awaited/asserted.

4. **Code Organization**
   - Test files: `service-worker-content-script.integration.test.ts` in `src/integration/` or equivalent.
   - Helper module: `chrome-runtime-mock.ts` providing fake `sendMessage`, `onMessage`, and event wiring.
   - Utilities: Functions to reset mocks between tests, inject cache state, simulate API responses.
   - Keep test cases independent, clean up all mocks and listeners after each test.

5. **Technical Challenges**
   - Simulate async message delivery and ensure all Promises resolve before assertions.
   - Emulate service worker lifecycle (activation, script teardown) if relevant; document in code if not fully covered.
   - Test error propagation: verify that errors in handlers are passed as rejections or error responses.
   - Ensure complete isolation: reset all global mocks and state between tests to avoid cross-test pollution.

6. **Success Metrics**
   - Achieve and enforce >80% line and branch coverage for service worker and content script modules.
   - All integration tests must pass consistently and quickly (<1s per test suite).
   - Code must remain clear, DRY, and idiomatic TypeScript.
   - Document test utilities, helpers, and non-obvious flows inline with code comments focused on *why*.
```