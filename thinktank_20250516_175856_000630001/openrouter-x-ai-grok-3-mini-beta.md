## Chosen Approach
Use Vitest to write integration tests that mock Chrome runtime APIs while testing bidirectional message passing between service worker and content script mocks.

## Rationale
- **Simplicity:** This approach is the simplest, requiring no additional frameworks beyond Vitest, aligning with the philosophy's emphasis on avoiding unnecessary complexity by leveraging existing tools and direct mocking of external APIs only.
- **Modularity and Strict Separation:** It maintains strict separation by isolating tests in dedicated files, treating the service worker and content script as modular units with clear interfaces, as per the philosophy's modularity principles, without mocking internal logic.
- **Testability:** Focuses on minimal mocking of true external boundaries (Chrome APIs), enabling high-fidelity tests of communication flows while adhering to the "no internal mocking" rule, thus prioritizing testability as a design constraint.
- **Coding Standards:** Ensures compliance by using Vitest's async support for messaging patterns and enforcing coverage checks, directly supporting the philosophy's standards for pure functions and error handling in tests.
- **Documentation Approach:** Generates self-documenting code through clear test names and inline comments on mock setups, favoring the philosophy's focus on explaining rationale without redundant documentation.

## Build Steps
1. Set up a new Vitest test file in `tests/integration/serviceWorkerContentScript.test.ts`, importing necessary modules from `src/service-worker/index.ts` and `src/content-script/messaging.ts`.
2. Create mocks for Chrome APIs using Vitest's `vi.mock('chrome.runtime')`, defining stubs for `sendMessage` and `onMessage` to simulate bidirectional communication.
3. Write test suites for key scenarios: happy paths (e.g., successful message exchange), error cases (e.g., API failures), and edge cases (e.g., delayed responses), ensuring >80% coverage via Vitest's coverage tools.
4. Implement helper functions to simulate service worker lifecycle and content script context, verifying responses against mock cache/API states without internal mocks.
5. Run tests in CI with `vitest run --coverage`, asserting bidirectional flows and handling async patterns, then refactor code if testability issues arise to maintain isolation.
6. Add TSDoc comments in tests to explain scenario rationales, ensuring the test file serves as executable documentation per the philosophy.