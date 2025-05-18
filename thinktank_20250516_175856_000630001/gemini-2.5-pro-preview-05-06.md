## Chosen Approach
Implement integration tests using a **Dedicated Test Harness (`ChromeRuntimeHarness`)** to simulate Chrome's runtime messaging environment, allowing real service worker and content script modules to communicate as they would in a browser, with only external Chrome APIs and `fetch` being mocked.

## Rationale
- **Simplicity (in tests):** The harness abstracts complex mocking logic, making individual test cases clean, focused on scenarios, and easier to write and understand.
- **Modularity + strict separation:** The harness is a distinct, reusable module responsible for mocking the *external* Chrome environment, cleanly separating test logic from mocking infrastructure. Internal application modules are not mocked.
- **Testability (minimal mocking):** The harness acts as the controlled mock for `chrome.*` APIs. The service worker and content script code run as-is, directly fulfilling the "NO Mocking Internal Collaborators" and "Mock ONLY True External System Boundaries" principles.
- **Maintainability:** Centralizing the simulation logic in the harness makes it easier to update if Chrome API behavior changes or if new communication patterns emerge. Tests remain stable.
- **Adherence to Philosophy:** This approach best embodies the core principles of simplicity (for test authors), modularity, testability with minimal and appropriate mocking, and clear coding standards for tests.

## Build Steps

### 1. Test Architecture Design

#### 1.1. Overall Structure
-   Tests will run in a Node.js environment using Vitest.
-   A `ChromeRuntimeHarness` class will be created to simulate the Chrome extension messaging environment.
-   This harness will mock `chrome.runtime.sendMessage`, `chrome.runtime.onMessage.addListener`, `chrome.runtime.onMessage.removeListener`, and `chrome.runtime.lastError`. It can be extended to mock `chrome.tabs.sendMessage` if required by the application logic.
-   The actual service worker (`src/service-worker/index.ts`) and content script (`src/content-script/messaging.ts`) modules will be dynamically imported into the test environment. Their internal logic, including calls to other internal modules, will **not** be mocked.
-   Truly external dependencies used by the service worker (e.g., `fetch` for API calls, `chrome.storage.local` if used for caching) will be mocked at the test level using Vitest's capabilities (e.g., `vi.spyOn(global, 'fetch')`).

#### 1.2. Modules to Test
-   **Primary:** `src/service-worker/index.ts` (specifically its message handling capabilities) and `src/content-script/messaging.ts` (its message sending and receiving logic).
-   **Indirectly:** Any internal modules these primary modules collaborate with (e.g., cache managers, API client wrappers within the service worker) will be part of the integration test, as they won't be mocked.

#### 1.3. Test Organization and File Structure
-   Integration tests will be located in a dedicated directory, e.g., `tests/integration/`.
-   Test file: `messaging.integration.test.ts`.
-   Harness file: `tests/harness/ChromeRuntimeHarness.ts`.
-   Shared utilities/mocks: `tests/utils/` or `tests/mocks/`.

#### 1.4. Mock Strategy for Chrome APIs (via Harness)
-   The `ChromeRuntimeHarness` will maintain internal state for registered `onMessage` listeners (e.g., `serviceWorkerListener`, `contentScriptListener`).
-   **`chrome.runtime.onMessage.addListener(callback)`**: The harness's mock will store `callback` associated with the context (SW or CS) that called it.
-   **`chrome.runtime.sendMessage(message, responseCallback?)`**:
    -   The harness's mock captures the `message`.
    -   It identifies the target context (e.g., if CS sends, target is SW; if SW sends to a specific tab/extension, target is CS).
    -   It invokes the stored listener of the target context with `(message, sender, sendResponseFn)`.
    -   `sender` will be a mock object (e.g., `{ id: 'extension-id', tab?: { id: number } }`).
    -   `sendResponseFn` is a function created by the harness. When called by the listener, it will:
        -   If `responseCallback` was provided to `sendMessage`, invoke `responseCallback` with the arguments passed to `sendResponseFn`.
        -   Handle the `return true;` convention for asynchronous responses. If the listener returns `true`, `sendResponseFn` must be callable later, and only then should `responseCallback` be triggered.
        -   Set/clear `chrome.runtime.lastError` appropriately.
-   **`chrome.runtime.lastError`**: Managed by the harness, set if `sendMessage` fails or `sendResponse` indicates an error.

### 2. Test Coverage Strategy

#### 2.1. Key Scenarios
-   **Content Script to Service Worker Request/Response:**
    -   CS sends a message (e.g., `GET_PRICE`).
    -   SW receives, processes (potentially interacting with mock cache/API).
    -   SW sends a response.
    -   CS receives the correct response.
-   **Service Worker to Content Script Push (if applicable):**
    -   SW proactively sends a message to CS (e.g., `PRICE_UPDATE`).
    -   CS receives and processes the message.
-   **Multiple Messages:** Sequential messages and responses.
-   **Concurrent Messages (if design supports):** Simulate near-simultaneous messages if the system should handle them.

#### 2.2. Happy Path Tests
-   **Cache Hit:** CS requests data, SW has it in cache (pre-populate cache state or mock `chrome.storage.local` if used by cache), SW responds from cache.
-   **Cache Miss, API Success:** CS requests data, SW cache miss, SW calls API (mock `fetch` to return success), SW updates cache, SW responds with API data.
-   **Successful SW to CS Push:** SW sends an update, CS listener is triggered with correct data.

#### 2.3. Error Cases and Edge Cases
-   **API Failure:** CS requests data, SW cache miss, SW calls API (mock `fetch` to return error), SW responds with an error or appropriate default.
-   **Invalid Message Format from CS:** CS sends a malformed message; SW handles gracefully (e.g., ignores, logs, or sends error response).
-   **No Listener in SW:** CS sends a message type the SW doesn't handle. Verify behavior (e.g., `responseCallback` might be called with `undefined` or `lastError` set).
-   **No Listener in CS for SW Push:** SW sends a message, but no CS listener is active for that type.
-   **`sendResponse` Not Called by SW:** SW listener receives a message but doesn't call `sendResponse`. Verify CS `responseCallback` behavior (timeout or specific handling).
-   **`sendResponse` Called Late (after listener returns non-true):** Behavior of `responseCallback`.
-   **`chrome.runtime.lastError` propagation:** Ensure errors during `sendMessage` (e.g., no receiving end) or within `sendResponse` are correctly propagated to `lastError` and handled by the calling script.

#### 2.4. Bidirectional Communication Tests
-   Cover scenarios where CS initiates, SW responds, and then SW might initiate a separate message back to CS based on some event.

Achieving >80% coverage will require testing the various conditional paths within the message handlers in both `service-worker/index.ts` and `content-script/messaging.ts`, driven by different message types and mock API/cache states.

### 3. Implementation Details

#### 3.1. Test Environment Setup
-   Vitest configuration (`vitest.config.ts`) will be standard.
-   Global setup file for Vitest (`tests/setup.ts`) might be used to globally mock `chrome` API via the harness for all integration tests in the suite, or harness instantiation will occur in `beforeEach`.
    ```typescript
    // Example: tests/setup.ts or in a beforeEach block
    import { ChromeRuntimeHarness } from './harness/ChromeRuntimeHarness';
    
    let harnessInstance: ChromeRuntimeHarness;
    
    beforeEach(async () => {
      harnessInstance = new ChromeRuntimeHarness();
      vi.stubGlobal('chrome', harnessInstance.getMockChromeApi());
    
      // Initialize SW and CS contexts so their listeners are registered with the harness
      // These functions will dynamically import the actual SW/CS code
      await harnessInstance.initServiceWorkerContext(async () => {
        await import('src/service-worker/index.ts');
      });
      await harnessInstance.initContentScriptContext(async () => {
        // Content script might register listeners directly or its messaging module does
        await import('src/content-script/messaging.ts'); 
      });
    });
    
    afterEach(() => {
      vi.unstubAllGlobals();
      harnessInstance.cleanup(); // Reset listeners, etc.
    });
    ```

#### 3.2. Mocking Chrome Runtime APIs (Core of `ChromeRuntimeHarness`)
-   **`ChromeRuntimeHarness.ts`**:
    ```typescript
    type MessageListener = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => boolean | void | Promise<void>;
    
    export class ChromeRuntimeHarness {
      private swListeners: MessageListener[] = [];
      private csListeners: MessageListener[] = [];
      private extensionId = 'test-extension-id';
    
      public getMockChromeApi() {
        return {
          runtime: {
            sendMessage: this.sendMessage.bind(this),
            onMessage: {
              addListener: this.onMessageAddListener.bind(this),
              removeListener: this.onMessageRemoveListener.bind(this),
              // hasListener, etc. if needed
            },
            id: this.extensionId,
            lastError: undefined as { message: string } | undefined,
            // getURL, getManifest etc. can be simple stubs if needed
            getURL: (path: string) => `chrome-extension://${this.extensionId}/${path}`,
          },
          // Mock other chrome APIs like tabs, storage as needed, or allow test-specific mocks
          tabs: {
            sendMessage: this.sendTabMessage.bind(this),
            // ... other tab methods if SW uses them to communicate
          }
        };
      }
    
      // Context initialization methods
      public async initServiceWorkerContext(initializer: () => Promise<void>) {
        this.currentContext = 'sw';
        await initializer();
        this.currentContext = null;
      }
    
      public async initContentScriptContext(initializer: () => Promise<void>) {
        this.currentContext = 'cs';
        await initializer();
        this.currentContext = null;
      }
    
      private currentContext: 'sw' | 'cs' | null = null;
    
      private onMessageAddListener(listener: MessageListener) {
        if (this.currentContext === 'sw') this.swListeners.push(listener);
        else if (this.currentContext === 'cs') this.csListeners.push(listener);
        // else throw error or handle default context
      }
    
      private onMessageRemoveListener(listener: MessageListener) {
        // Implement removal logic
      }
    
      private sendMessage(extensionIdOrMessage: any, messageOrResponseCallback?: any, responseCallback?: (response?: any) => void) {
        let targetExtensionId: string | undefined;
        let message: any;
        let actualResponseCallback: ((response?: any) => void) | undefined;
    
        if (typeof extensionIdOrMessage === 'string') {
          targetExtensionId = extensionIdOrMessage;
          message = messageOrResponseCallback;
          actualResponseCallback = responseCallback;
        } else {
          message = extensionIdOrMessage;
          actualResponseCallback = messageOrResponseCallback;
        }
        
        if (targetExtensionId && targetExtensionId !== this.extensionId) {
            // Simulate message to other extension - likely out of scope or error
            this.getMockChromeApi().runtime.lastError = { message: "Invalid extension ID" };
            if (actualResponseCallback) actualResponseCallback();
            return Promise.resolve(); // Or reject, depending on Chrome's behavior
        }

        // Simulate CS -> SW or SW -> CS (if not using tabs.sendMessage)
        // This simplified example assumes CS always sends to SW, and SW might send to CS (needs refinement for SW->CS targetting)
        const listeners = this.swListeners; // Assuming CS is sender, SW is receiver for typical sendMessage
        const sender: chrome.runtime.MessageSender = { id: this.extensionId, /* tab if applicable */ };
        
        this.getMockChromeApi().runtime.