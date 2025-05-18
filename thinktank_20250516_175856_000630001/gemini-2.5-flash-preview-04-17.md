```markdown
## Chosen Approach
Directly mock the `chrome.runtime` API to simulate message passing and test the actual service worker and content script messaging modules in collaboration.

## Rationale
-   **Adherence to Philosophy:** This approach strictly adheres to the core development philosophy by mocking *only* the external `chrome.runtime` API boundary. It avoids mocking any internal modules or collaborators within the service worker or content script code.
-   **Integration Testing:** It effectively tests the integration and collaboration between the actual service worker messaging logic (`src/service-worker/index.ts`) and the content script messaging logic (`src/content-script/messaging.ts`) by simulating their interaction over the mocked Chrome API.
-   **Real Code Paths:** Verifies that the real message sending and receiving code paths in both modules function correctly when communicating through a simulated environment that mimics the browser's messaging channel.
-   **Testability:** While requiring careful mock implementation, this design makes the communication layer testable by isolating it from the real browser environment and allowing programmatic control over message flow and responses.

## Build Steps
1.  Set up the Vitest testing environment within the project, ensuring it's configured to handle TypeScript files.
2.  Create a dedicated test utility file (e.g., `src/test/chrome-messaging-mock.ts`) to implement the mock `global.chrome.runtime` object and its relevant methods (`sendMessage`, `onMessage`).
3.  Within the `chrome-messaging-mock.ts` utility:
    -   Implement `global.chrome.runtime.onMessage.addListener` to store the listener function registered by the service worker or content script. Provide methods to retrieve or manage the registered listeners.
    -   Implement `global.chrome.runtime.sendMessage` to capture the message being sent. This mock will need to simulate the message being received by the *other* context.
    -   Implement helper functions (e.g., `simulateMessageFromCS`, `simulateMessageFromSW`) that allow test cases to trigger the appropriate stored `onMessage` listener with a simulated message payload, a mock `sender` object, and a mock `sendResponse` callback function.
    -   Implement the mock `sendResponse` callback provided to the `onMessage` listener. This mock should capture the response and potentially trigger the *sender's* `onMessage` listener (if they are expecting a response) using another helper function, thus simulating the response flow.
4.  Create test files for the messaging integration tests (e.g., `src/integration/messaging.test.ts`). Organize tests by communication flow or feature.
5.  In each test file, import the `chrome-messaging-mock.ts` utility and call a setup function from it to establish the mock `global.chrome` object *before* importing the modules under test.
6.  Import the actual service worker entry file (`src/service-worker/index.ts`) and the content script messaging file (`src/content-script/messaging.ts`). Their initialization code will run, registering their real `onMessage` listeners with the mock `chrome.runtime.onMessage`.
7.  Write test cases that leverage the helper functions from `chrome-messaging-mock.ts` to simulate specific message exchanges:
    -   Call the content script function that initiates a message (e.g., `contentScript.requestPrice()`).
    -   Use `simulateMessageFromCS` to pass the captured message from the mock `sendMessage` to the service worker's registered `onMessage` listener, including a mock `sendResponse`.
    -   Inside the test, capture the argument passed to the mock `sendResponse` callback.
    -   If the content script expects a response via its `onMessage` listener, use `simulateMessageFromSW` (or a similar helper) to trigger the content script's listener with the captured response.
    -   Assert that the expected actions occurred (e.g., specific data was returned, a certain function was called, an error was handled).
8.  Cover key scenarios: content script request -> service worker response (happy path with cache hit/miss, error path), service worker -> content script messages (if applicable), invalid message types, and edge cases related to message structure or simulated service worker state (e.g., simulating API success/failure outcomes within the test's control flow).
9.  Ensure test cases use the shared message types defined in `src/common/types.ts` for clarity and correctness.
10. Configure Vitest coverage reporting to specifically track coverage for `src/service-worker/index.ts` and `src/content-script/messaging.ts`, aiming for the >80% target.
11. Add the test execution command (`vitest run --coverage`) to the project's CI pipeline to enforce test passes and coverage thresholds.
```