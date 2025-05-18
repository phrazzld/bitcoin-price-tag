```
## Chosen Approach
Directly test service-worker/index.ts event handlers with real internal modules, mocking only Chrome APIs, organized by handler; cover all message/alarms flows and errors for >80% coverage.

## Rationale
- Aligns with strict mocking policy: mocks only true external boundaries (Chrome APIs), never internal modules (cache.ts, api.ts).
- Event handlers are tested as public API, maximizing behavioral coverage and minimizing coupling to implementation details.
- Modular test organization by event handler increases maintainability and clarity.
- Test cases encompass happy paths, errors, edge cases by manipulating mock Chrome API responses.
- FIRST principles: tests are fast, isolated (Chrome API mocks reset per test), thorough, and self-validating.

## Build Steps
1. Refactor service-worker/index.ts if necessary to:
    - Export event handler functions so they can be imported directly in tests (if not already).
    - Parameterize Chrome APIs for injection in tests if handlers access them via global (optional, only if direct mocking is difficult).
2. Set up the test environment:
    - Use Jest or equivalent; configure to reset modules and mocks between tests.
    - Globally mock Chrome APIs (`chrome.runtime`, `chrome.alarms`) using Jest’s manual mocks or similar.
    - Do NOT mock or stub internal modules (`cache.ts`, `api.ts`); use their real implementations.
3. For each event handler (message, alarms, install, activate, etc.):
    - Write a test suite covering:
        - Normal operation (happy path): simulate relevant Chrome events/messages, assert correct effects (function calls, state changes).
        - Edge cases: e.g., unexpected messages, missing data, repeated events.
        - Error handling: simulate failures in Chrome APIs or thrown errors, assert correct logging or recovery.
        - Multiple messages/alarms in sequence for stateful handlers.
    - Assert that:
        - The correct internal functions are called with expected arguments.
        - Chrome API methods are called as expected.
        - Handlers behave correctly in all scenarios.
4. Use coverage tools to ensure line/branch coverage >80%; add tests for any uncovered paths (especially error/branch handling).
5. Document test structure and rationale in a README or code comments, focusing on the why (mocking boundaries, event-driven coverage).
```