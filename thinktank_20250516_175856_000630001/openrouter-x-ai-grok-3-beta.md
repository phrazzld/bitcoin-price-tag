## Chosen Approach
Implement integration tests for service worker and content script communication using Vitest with Chrome API mocking at external boundaries, focusing on real message passing scenarios without internal mocking.

## Rationale
- **Simplicity:** This approach prioritizes straightforward test setup with minimal abstraction, directly simulating message passing using mocked Chrome APIs, aligning with the philosophy of simplicity first.
- **Modularity:** By isolating tests to focus on communication boundaries and organizing them by feature (service worker and content script interactions), it ensures strict separation of concerns as per the core principles.
- **Testability:** Adhering to the no-internal-mocking policy, it mocks only external Chrome APIs, ensuring tests verify real behavior through public interfaces, supporting the design for testability principle.
- **Coding Standards:** Leverages Vitest and TypeScript strictness, maintaining explicitness and type safety as mandated by the TypeScript appendix, ensuring high code quality.
- **Documentation Approach:** Focuses on self-documenting test cases with clear naming and structure, supplemented by minimal comments on rationale, aligning with the philosophy of documenting the "why" over the "how."

## Build Steps
1. **Set Up Test Environment:** Configure Vitest in the project with a dedicated test configuration (`vitest.config.ts`) targeting Chrome extension environment, ensuring it supports TypeScript and runs in a Node.js context with jsdom or similar for DOM simulation if needed.
2. **Mock Chrome APIs:** Create a mock implementation for `chrome.runtime` in a utility file (`test/utils/chrome-mock.ts`), simulating `sendMessage` and `onMessage` to handle bidirectional communication without touching internal logic, strictly adhering to external boundary mocking policy.
3. **Organize Test Files:** Place integration tests in `test/integration/` with subdirectories for `service-worker` and `content-script`, naming files descriptively (e.g., `service-worker-communication.test.ts`), focusing on specific interaction scenarios.
4. **Implement Test Scenarios:** Write test suites for happy paths (successful price request/response), error cases (API failure, cache miss), and edge cases (timeout, malformed messages), ensuring >80% coverage of communication logic in both directions.
5. **Simulate Message Passing:** Use the mocked Chrome APIs to simulate sending messages from content script to service worker and vice versa, verifying responses and state changes through assertions on received data.
6. **Handle Async Patterns:** Utilize Vitest’s async testing capabilities (`await` with `vi.waitFor`) to manage asynchronous messaging, ensuring tests account for real-world delays and event-driven behavior.
7. **Run and Verify Coverage:** Execute tests with `vitest run --coverage`, using a coverage tool like `c8` to confirm >80% coverage, adjusting test cases if gaps are identified, and enforce this threshold in CI pipeline.
8. **Document Key Decisions:** Add concise comments in test files explaining complex test setup rationale or edge case reasoning, maintaining self-documenting code while adhering to the documentation philosophy of focusing on "why."