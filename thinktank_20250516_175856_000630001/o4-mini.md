## Chosen Approach
Use Vitest to import both messaging modules, mock only `chrome.runtime` in a test setup, and simulate in-process bidirectional messaging to cover all happy and error paths.

## Rationale
- Simplicity: no headless browser or external runner—all tests run in-process under Vitest.  
- Modularity: exercises only the public messaging APIs of service worker and content script, no internal mocks.  
- Policy-compliant: mocks only the external Chrome runtime boundary.  
- Fast feedback: in-process tests are deterministic and run quickly in CI.  
- Coverage: covers both directions and edge cases to exceed 80%.

## Build Steps
1. Create a Vitest setup file (`tests/setup/browserMocks.ts`) that defines `global.chrome = { runtime: { sendMessage: vi.fn(), onMessage: { addListener: vi.fn() } } }`.  
2. Reference that setup in `vitest.config.ts` under `test.setupFiles` so it loads before tests.  
3. In `tests/utils/messagingMocks.ts`, export helpers to reset mocks, capture registered listeners, and emit messages by invoking the stored callbacks.  
4. Write `tests/integration/messaging.test.ts`:
   1. Before each test, reset the mock registry and re-import `src/service-worker/index.ts` and `src/content-script/messaging.ts` to re-register listeners.  
   2. Happy-path CS→SW: mock cache state or stub `fetch`, call the content-script API (e.g. `sendPriceRequest()`), trigger the SW listener via your helper, and assert the resolved price payload.  
   3. Error-path CS→SW: stub `fetch` to reject, repeat above, assert the Promise rejects with the expected error.  
   4. SW→CS: call the SW’s broadcast function, use your helper to capture the CS listener invocation, and assert correct message shape.  
   5. Edge cases: unknown message types, empty cache, concurrent requests.  
5. Configure coverage thresholds in `vitest.config.ts` (`coverage.lines = 80`) and run `vitest --coverage` in CI.  
6. Add the new test suite to the CI pipeline’s integration-test stage to enforce passing results and coverage gates.