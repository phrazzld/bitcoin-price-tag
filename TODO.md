# Todo

## Common (`src/common/constants.ts`)
- [x] **T001 · Chore · P1: add DOM observer debounce constant**
    - **Context:** PLAN.md > Detailed Build Steps > Step 4
    - **Action:**
        1. Add `export const DOM_OBSERVER_DEBOUNCE_MS = 250;` (or a similar tunable value) to `src/common/constants.ts`.
    - **Done‑when:**
        1. The `DOM_OBSERVER_DEBOUNCE_MS` constant is defined, exported, and available for use.
    - **Depends‑on:** none
    - **Results:**
        1. Added `DOM_OBSERVER_DEBOUNCE_MS` constant with value of 250ms
        2. Added JSDoc comments with explanation of purpose and trade-offs
        3. Added reference to future `src/content-script/dom-observer.ts` file
        4. Unit tests still pass

## DOM Annotation (`src/content-script/dom.ts`)
- [x] **T002 · Refactor · P1: modify `findAndAnnotatePrices` signature to accept `processedNodes`**
    - **Context:** PLAN.md > Detailed Build Steps > Step 3; Public Interfaces / Contracts
    - **Action:**
        1. Change the signature of `findAndAnnotatePrices` to `export function findAndAnnotatePrices(rootNode: Node, priceData: PriceData, processedNodes: Set<Node>): void;`.
    - **Done‑when:**
        1. The function signature is updated in `src/content-script/dom.ts`.
        2. TSDoc for the function is updated to reflect the new signature.
    - **Depends‑on:** none
    - **Results:**
        1. Updated function signature to include the new processedNodes parameter
        2. Changed the parameter name from `rootElement` to `rootNode` to better represent the type
        3. Added detailed TSDoc comment explaining the purpose of the processedNodes parameter
        4. Updated all test cases to pass the new Set<Node>() parameter
        5. All tests are passing

- [x] **T003 · Feature · P1: implement `processedNodes` check and update logic in `findAndAnnotatePrices`**
    - **Context:** PLAN.md > Detailed Build Steps > Step 3; Error & Edge‑Case Strategy > Redundant Processing
    - **Action:**
        1. In the DOM traversal logic within `findAndAnnotatePrices` (e.g., `walkNodes`):
            *   Before processing a node, add the check: `if (processedNodes.has(node)) { return; }`.
            *   After a node and its relevant children have been fully processed, add `processedNodes.add(node);`.
    - **Done‑when:**
        1. `findAndAnnotatePrices` correctly skips nodes present in the `processedNodes` set.
        2. `findAndAnnotatePrices` correctly adds processed nodes to the `processedNodes` set.
    - **Verification:**
        1. Unit tests (T018) confirm that nodes are skipped and added correctly.
    - **Depends‑on:** [T002]
    - **Results:**
        1. Added processedNodes check at the beginning of walkNodes function: `if (processedNodes.has(node)) { return; }`
        2. Added code to add the node to processedNodes after it's processed: `processedNodes.add(node);`
        3. Modified the walkNodes function signature to accept processedNodes
        4. Updated the findAndAnnotatePrices function to pass processedNodes to walkNodes
        5. Added unit tests to verify:
           - Nodes in processedNodes set are skipped
           - Nodes are added to processedNodes after processing
           - New nodes are processed while previously processed nodes are skipped when using the same set

- [x] **T004 · Feature · P2: add logging for `processedNodes` handling in `findAndAnnotatePrices`**
    - **Context:** PLAN.md > Logging & Observability > `src/content-script/dom.ts`
    - **Action:**
        1. Add `DEBUG` log: `Node skipped (already processed). {nodeName, nodeType}` when a node is skipped.
        2. Add `DEBUG` log: `Node added to processed set. {nodeName, nodeType}` when a node is added to the set.
    - **Done‑when:**
        1. Specified debug logs are implemented and appear correctly during annotation.
    - **Depends‑on:** [T003]
    - **Results:**
        1. Imported createLogger from shared/logger module
        2. Created a module logger with name 'content-script:dom'
        3. Added DEBUG level log with node details when a node is skipped due to being already processed
        4. Added DEBUG level log with node details when a node is added to the processedNodes set
        5. Verified through unit tests that functionality is preserved

## DOM Observer (`src/content-script/dom-observer.ts` - New Module)
- [x] **T005 · Feature · P1: define `DomObserverController` interface and `createDomObserver` factory skeleton**
    - **Context:** PLAN.md > Detailed Build Steps > Step 2; Public Interfaces / Contracts
    - **Action:**
        1. Create the new file `src/content-script/dom-observer.ts`.
        2. Define and export the `DomObserverController` interface as specified in PLAN.md.
        3. Define and export the `createDomObserver` factory function signature, ensuring it accepts `rootElementToObserve`, `annotationFunction`, `debounceMilliseconds`, and `initialProcessedNodes: Set<Node>`.
    - **Done‑when:**
        1. `src/content-script/dom-observer.ts` file is created.
        2. `DomObserverController` interface and `createDomObserver` function signature are defined and exported as per plan (with `initialProcessedNodes` added to factory).
    - **Depends‑on:** none
    - **Results:**
        1. Created `src/content-script/dom-observer.ts` file with proper documentation
        2. Defined and exported `DomObserverController` interface with `start()` and `stop()` methods
        3. Defined and exported `createDomObserver` factory function with all required parameters:
            - `rootElementToObserve: HTMLElement`
            - `annotationFunction: (targetNode: Node, priceData: PriceData, processedNodes: Set<Node>) => void`
            - `debounceMilliseconds: number`
            - `initialProcessedNodes: Set<Node>`
        4. Implemented a minimal skeleton with basic logging
        5. Verified that TypeScript compiles without errors for the new file

- [x] **T006 · Feature · P1: implement `createDomObserver`: `start()` method**
    - **Context:** PLAN.md > Detailed Build Steps > Step 2
    - **Action:**
        1. Implement the `start(priceData: PriceData)` method within the controller returned by `createDomObserver`.
        2. Store the provided `priceData` and use the `initialProcessedNodes` (passed to `createDomObserver`) as `this.processedNodes`.
        3. Create `this.observer = new MutationObserver(this.handleMutationsCallback.bind(this))` and call `this.observer.observe(rootElementToObserve, { childList: true, subtree: true })`.
    - **Done‑when:**
        1. `start()` method correctly stores `priceData` and uses the passed `initialProcessedNodes`.
        2. `MutationObserver` is instantiated and `observe()` is called with correct configuration.
    - **Depends‑on:** [T005]
    - **Results:**
        1. Implemented the start() method to store the provided priceData in a closure variable
        2. Reused the initialProcessedNodes set from the factory function
        3. Created a MutationObserver instance with a handleMutationsCallback function
        4. Configured the observer with childList and subtree options and started it
        5. Added a placeholder for the handleMutationsCallback function (to be implemented in T008)
        6. Added detailed comments and maintained the existing logging
        7. Verified the implementation with TypeScript checks

- [x] **T007 · Feature · P1: implement `createDomObserver`: `stop()` method**
    - **Context:** PLAN.md > Detailed Build Steps > Step 2
    - **Action:**
        1. Implement the `stop()` method within the controller returned by `createDomObserver`.
        2. Call `this.observer.disconnect()`.
        3. Clear any pending debounced calls to `processDebouncedNodes`.
    - **Done‑when:**
        1. `stop()` method correctly calls `observer.disconnect()`.
        2. Pending debounced calls are cleared.
    - **Depends‑on:** [T005, T009]
    - **Results:**
        1. Implemented the `stop()` method to disconnect the MutationObserver
        2. Added null checks for defensive programming
        3. Set observer to null after disconnection to allow for garbage collection
        4. Leveraged existing code for clearing the debounce timeout
        5. Added detailed DEBUG level logging for the disconnection
        6. Maintained the INFO level log for overall observer stoppage

- [x] **T008 · Feature · P1: implement `createDomObserver`: `handleMutationsCallback()`**
    - **Context:** PLAN.md > Detailed Build Steps > Step 2
    - **Action:**
        1. Implement `handleMutationsCallback(mutations: MutationRecord[])`.
        2. Collect all `addedNodes` from `mutations`.
        3. Schedule/reschedule a debounced function (`this.processDebouncedNodes`) to process these collected nodes.
    - **Done‑when:**
        1. `handleMutationsCallback` correctly extracts `addedNodes`.
        2. `addedNodes` are correctly passed to the debouncing mechanism for processing.
    - **Depends‑on:** [T005, T009]
    - **Results:**
        1. Implemented handleMutationsCallback to extract all added nodes from mutations
        2. Added early exit logic for empty mutations or no added nodes
        3. Converted NodeList to Array for easier processing
        4. Added detailed logging for mutation counts and added nodes 
        5. Connected the function to the scheduleProcessing debounce mechanism
        6. Added proper documentation with JSDoc comments
        7. Ensured clean code with appropriate error handling

- [x] **T009 · Feature · P1: implement debouncing mechanism for `processDebouncedNodes`**
    - **Context:** PLAN.md > Detailed Build Steps > Step 2; Error & Edge‑Case Strategy > Mutation Storms / Rapid DOM Changes
    - **Action:**
        1. Implement a debouncing mechanism (e.g., using `setTimeout`/`clearTimeout`) within `dom-observer.ts`.
        2. Ensure `handleMutationsCallback` uses this to schedule/reschedule `processDebouncedNodes`.
        3. Collected nodes from multiple rapid mutations should be batched for a single `processDebouncedNodes` call.
    - **Done‑when:**
        1. `processDebouncedNodes` is called only after `debounceMilliseconds` of inactivity following mutation detection.
        2. Node batching for rapid mutations is functional.
    - **Depends‑on:** [T005, T001]
    - **Results:**
        1. Implemented the debouncing mechanism using `setTimeout` and `clearTimeout`
        2. Created a `scheduleProcessing` function that adds nodes to a collection and manages the timeout
        3. Added internal state variables (`timeoutId` and `pendingNodes`) to track timeout and collect nodes
        4. Created a placeholder `processDebouncedNodes` function for T010 to complete
        5. Ensured the `handleMutationsCallback` uses the debouncing mechanism (minimal placeholder for now)
        6. Added code to clear timeouts in the `stop()` method
        7. Added detailed logging about the debouncing process

- [x] **T010 · Feature · P1: implement `createDomObserver`: `processDebouncedNodes()`**
    - **Context:** PLAN.md > Detailed Build Steps > Step 2
    - **Action:**
        1. Implement `processDebouncedNodes(nodesToProcess: Node[])`.
        2. Iterate through `nodesToProcess`. For each node, call the stored `annotationFunction(node, this.priceData, this.processedNodes)`.
    - **Done‑when:**
        1. `processDebouncedNodes` iterates through nodes and calls the `annotationFunction` with the correct `node`, internally stored `priceData`, and the shared `processedNodes` set.
    - **Depends‑on:** [T005, T009]
    - **Results:**
        1. Implemented `processDebouncedNodes` to process collected nodes from mutations
        2. Added safety checks for null price data and empty node sets
        3. Implemented iteration through all nodes in the pendingNodes set
        4. Added proper error handling with try/catch at multiple levels
        5. Called the annotationFunction with correct arguments (node, priceData, processedNodes)
        6. Added performance tracking and logging for monitoring and debugging
        7. Ensured cleanup of internal state in all code paths with try/finally

- [x] **T011 · Feature · P2: filter irrelevant nodes in `dom-observer.ts` before annotation**
    - **Context:** PLAN.md > Error & Edge‑Case Strategy > Ignoring Irrelevant Mutations
    - **Action:**
        1. In `handleMutationsCallback` or at the start of `processDebouncedNodes`, filter the list of `addedNodes`.
        2. Exclude non-Element nodes (e.g., text nodes directly under the observed root).
        3. Exclude `<script>` and `<style>` elements from being passed to the `annotationFunction`.
    - **Done‑when:**
        1. The `annotationFunction` is not called for non-Element nodes or for `<script>`/`<style>` elements originating from `addedNodes`.
    - **Depends‑on:** [T008, T010]
    - **Results:**
        1. Implemented `shouldProcessNode` utility function to filter DOM nodes
        2. Added filtering inside `processDebouncedNodes` before calling the annotation function
        3. Added filtering rules to:
           - Skip non-Element nodes (nodeType !== Node.ELEMENT_NODE)
           - Skip script and style elements (nodeName === 'SCRIPT' || nodeName === 'STYLE')
        4. Added detailed logging for filtered nodes with count tracking
        5. Updated completion logging with additional metrics (processed vs filtered counts)
        6. Ensured clean, maintainable code following the development philosophy

- [x] **T012 · Feature · P2: add logging for `dom-observer.ts` lifecycle and processing**
    - **Context:** PLAN.md > Logging & Observability > `src/content-script/dom-observer.ts`
    - **Action:**
        1. Implement all `INFO`, `DEBUG`, and `ERROR` log events as specified in the PLAN.md for `dom-observer.ts`.
    - **Done‑when:**
        1. All specified logs are implemented and appear correctly with structured fields.
    - **Depends‑on:** [T005, T006, T007, T008, T010]
    - **Results:**
        1. Added or updated all required log statements from PLAN.md
        2. Standardized log message format and field names to match plan
        3. Implemented error handling with appropriate ERROR logs for all key functions
        4. Added detailed error information (message and stack) for all error logs
        5. Ensured consistent structured fields for all logs

## Content Script Core (`src/content-script/index.ts`)
- [x] **T013 · Refactor · P1: remove fixed `setTimeout` for initialization in `index.ts`**
    - **Context:** PLAN.md > Detailed Build Steps > Step 1
    - **Action:**
        1. Remove the `setTimeout(initPriceAnnotation, INITIAL_REQUEST_DELAY)` call.
        2. Ensure subsequent initialization logic is triggered after `DOMContentLoaded` or if `document.readyState !== 'loading'`.
    - **Done‑when:**
        1. The fixed `setTimeout` is removed.
        2. Initialization sequence is correctly tied to DOM readiness.
    - **Depends‑on:** none
    - **Results:**
        1. Removed the `INITIAL_REQUEST_DELAY` constant as it's no longer needed
        2. Removed the `runWithDelay` function that used setTimeout
        3. Modified initialization logic to call `initPriceAnnotation` directly after DOM is ready
        4. Maintained existing DOM readiness checks (document.readyState and DOMContentLoaded)
        5. Improved JSDoc documentation for the initialize function

- [x] **T014 · Feature · P1: implement `DOMContentLoaded` logic for price data fetching and `processedNodes` creation**
    - **Context:** PLAN.md > Detailed Build Steps > Step 1
    - **Action:**
        1. After DOM readiness, call `requestPriceData()` from `messaging.ts`.
        2. On successful `priceData` retrieval, create `const processedNodes = new Set<Node>()`.
    - **Done‑when:**
        1. `requestPriceData` is called upon DOM readiness.
        2. `processedNodes` set is created on successful data retrieval.
    - **Depends‑on:** [T013]
    - **Results:**
        1. Created a Set<Node> instance after successful price data retrieval
        2. Updated the findAndAnnotatePrices call to pass the processedNodes set
        3. Added logging for processedNodes creation and tracking
        4. Updated JSDoc comments to document the changes
        5. Verified implementation with TypeScript type checking

- [ ] **T015 · Feature · P1: implement initial full-DOM scan using `findAndAnnotatePrices`**
    - **Context:** PLAN.md > Detailed Build Steps > Step 1
    - **Action:**
        1. After `priceData` is successfully retrieved and `processedNodes` is created, call `findAndAnnotatePrices(document.body, priceData, processedNodes)`.
    - **Done‑when:**
        1. The initial full-DOM scan is performed using the shared `processedNodes` set.
    - **Depends‑on:** [T014, T003]

- [ ] **T016 · Feature · P1: instantiate and start `DomObserver` after initial scan**
    - **Context:** PLAN.md > Detailed Build Steps > Step 1
    - **Action:**
        1. After the initial scan, instantiate the DOM observer: `const domObserver = createDomObserver(document.body, findAndAnnotatePrices, DOM_OBSERVER_DEBOUNCE_MS, processedNodes)`.
        2. Start the observer: `domObserver.start(priceData)`.
    - **Done‑when:**
        1. `createDomObserver` is called with `document.body`, `findAndAnnotatePrices`, the debounce constant, and the shared `processedNodes` set.
        2. `domObserver.start(priceData)` is called.
    - **Depends‑on:** [T015, T005, T001]

- [ ] **T017 · Feature · P2: implement logging for `index.ts` (initialization, errors)**
    - **Context:** PLAN.md > Detailed Build Steps > Step 1; Logging & Observability > `src/content-script/index.ts`
    - **Action:**
        1. Implement all `INFO` and `ERROR` log events as specified in PLAN.md for `index.ts`.
    - **Done‑when:**
        1. All specified logs related to initialization and price data fetching (success/failure) are implemented.
    - **Depends‑on:** [T014, T015, T016]

## Testing
- [x] **T018 · Test · P1: write unit tests for `processedNodes` logic in `findAndAnnotatePrices` (`dom.ts`)**
    - **Context:** PLAN.md > Testing Strategy > Unit Tests (`dom.ts`)
    - **Action:**
        1. Test that nodes in the `processedNodes` set are skipped by `findAndAnnotatePrices`.
        2. Test that newly processed nodes are correctly added to the `processedNodes` set.
    - **Done‑when:**
        1. Unit tests achieve >90% coverage for the `processedNodes` related logic in `dom.ts`.
    - **Depends‑on:** [T003]
    - **Results:**
        1. Added three comprehensive unit tests in a new "processedNodes functionality" describe block:
           - Test to verify nodes already in processedNodes are skipped
           - Test to verify processed nodes are added to the set
           - Test to verify partial processing works (some nodes processed, others skipped)
        2. All tests pass, demonstrating the functionality works correctly

- [ ] **T019 · Test · P1: write unit tests for `dom-observer.ts`**
    - **Context:** PLAN.md > Testing Strategy > Unit Tests (`dom-observer.ts`)
    - **Action:**
        1. Mock `MutationObserver`. Test `createDomObserver` instantiation, `start()`, `stop()`.
        2. Test `handleMutationsCallback` for correct collection of `addedNodes`.
        3. Test debouncing logic using fake timers to ensure `annotationFunction` is called correctly after rapid mutations.
        4. Test that `annotationFunction` is called with correct arguments (`node`, `priceData`, `processedNodes` set).
    - **Done‑when:**
        1. Unit tests achieve >90% coverage for new logic in `dom-observer.ts`.
    - **Depends‑on:** [T005, T006, T007, T008, T009, T010, T011]

- [ ] **T020 · Test · P1: write integration tests for `index.ts` initialization flow**
    - **Context:** PLAN.md > Testing Strategy > Integration Tests (`content-script/index.ts` initialization)
    - **Action:**
        1. Simulate `DOMContentLoaded`. Mock `messaging.ts` (`requestPriceData`) to control `priceData` delivery.
        2. Verify that after `priceData` is received, initial `findAndAnnotatePrices` is called on `document.body`.
        3. Verify `createDomObserver` is called and `domObserver.start()` is invoked.
    - **Done‑when:**
        1. Integration tests verify the correct sequence of operations during content script initialization.
    - **Depends‑on:** [T016, T003, T005]

- [ ] **T021 · Test · P1: write integration tests for `DomObserver` and `DomAnnotator` interaction**
    - **Context:** PLAN.md > Testing Strategy > Integration Tests (Test the interaction between `DomObserver` and `DomAnnotator`)
    - **Action:**
        1. Use JSDOM/HappyDOM. Programmatically add elements to the DOM.
        2. Verify the `MutationObserver` triggers, `dom-observer.ts` collects nodes, debouncing works, and `findAndAnnotatePrices` is eventually called on new nodes with the `processedNodes` set being updated and respected.
    - **Done‑when:**
        1. Integration tests verify the correct end-to-end flow from DOM mutation to annotation of new elements.
    - **Depends‑on:** [T019, T003]

- [ ] **T022 · Test · P1: perform E2E testing on static and dynamic pages**
    - **Context:** PLAN.md > Detailed Build Steps > Step 7; Testing Strategy > End-to-End (E2E) Tests
    - **Action:**
        1. Test on static HTML pages with prices.
        2. Test on SPAs (e.g., simple test app, known public SPA) and pages with content loaded via XHR/fetch or