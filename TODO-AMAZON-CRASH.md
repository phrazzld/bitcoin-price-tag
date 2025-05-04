# Amazon Crash Bug Fix

- [x] **T020:** Enhance Context Detection for Restricted Environments
    - **Action:** Refactor context detection functions (e.g., `isAmazonRestrictedIframe`, `isExtensionContextAvailable` likely in `src/utils/context.ts` or similar) to reliably identify sandboxed iframes and other restricted execution contexts on Amazon. Incorporate checks for sandbox attributes, CSP headers, and specific URL patterns. Add logging to report the detected context.
    - **Depends On:** None
    - **AC Ref:** None

- [x] **T021:** Implement Early Exit in Content Script Entry Points
    - **Action:** Modify content script bootstrap/entry points (e.g., `src/content/bootstrap.ts`, `src/content/index.ts`) to use the enhanced context detection (T020). If a restricted context is detected where the extension cannot fully function, log the decision and exit immediately to prevent further script execution and potential errors.
    - **Depends On:** [T020]
    - **AC Ref:** None

- [x] **T022:** Implement Safe Callback Wrapping Utility
    - **Action:** Create or enhance a `safeCallback` utility function (e.g., in `src/utils/callbacks.ts`) that wraps callback functions. This wrapper should check if the provided callback is actually a function before attempting to execute it, logging an error or warning if it's not.
    - **Depends On:** None
    - **AC Ref:** None

- [x] **T023:** Apply Safe Callback Wrapper to Messaging Bridge Calls
    - **Action:** Audit all calls to `chrome.runtime.sendMessage` (primarily in `src/content/` and `src/bridge/`) and ensure the callback argument is passed through the `safeCallback` utility created in T022.
    - **Depends On:** [T022]
    - **AC Ref:** None

- [x] **T024:** Add Robust Type Checks Before Invoking Received Callbacks
    - **Action:** Review message handling logic (e.g., in `src/background/messageHandler.ts`, `src/bridge/index.ts`) where callbacks received via messages are invoked. Implement explicit `typeof callback === 'function'` checks immediately before invocation to prevent errors if an invalid callback was somehow passed.
    - **Depends On:** None
    - **AC Ref:** None

- [ ] **T025:** Harden Messaging Bridge Availability Checks and Fallbacks
    - **Action:** Refactor logic that uses the messaging bridge (e.g., `src/bridge/index.ts`, `src/content/index.ts`) to perform robust checks for the availability and integrity of the bridge (`chrome.runtime.sendMessage`, etc.) before use, especially considering context limitations (T021). Implement clear fallback behaviors (e.g., logging errors, disabling features, returning default error objects) when the bridge is unavailable or fails.
    - **Depends On:** [T021]
    - **AC Ref:** None

- [ ] **T026:** Refactor Amazon DOM Processing for Resilience and Context Awareness
    - **Action:** Update Amazon-specific DOM processing logic (e.g., in `src/content/amazon.ts`, `src/content/domScanner.ts`). Add defensive checks against unexpected DOM structures. Ensure complex or potentially error-prone DOM operations are skipped entirely when running in a restricted context detected by T021. Review `WeakSet` usage for correctness if applicable.
    - **Depends On:** [T021]
    - **AC Ref:** None

- [ ] **T027:** Enhance Contextual Error Logging Across Key Modules
    - **Action:** Implement structured, context-aware logging (following project standards) in modules modified by T020, T021, T023, T024, T025, T026. Logs should capture context (e.g., URL, detected context type), decision points (e.g., early exit triggered), and specific error details to facilitate debugging, especially on Amazon.
    - **Depends On:** [T021, T023, T024, T025, T026]
    - **AC Ref:** None

- [ ] **T028:** Comprehensive Testing and Verification on Amazon Pages
    - **Action:** Perform thorough manual and automated (e.g., Cypress, Playwright) testing across a variety of Amazon pages (product, cart, search, pages with known iframes). Verify: (1) No crashes or blank pages occur. (2) Extension functionality works as expected in supported contexts. (3) Graceful degradation or early exit occurs in restricted contexts. (4) Console errors related to context, callbacks, bridge, and DOM processing are eliminated.
    - **Depends On:** [T027] // Depends on all implementation tasks being logged correctly for verification
    - **AC Ref:** None

- [ ] **T029:** Mark Original Bug Task as Complete
    - **Action:** Once T028 is successfully completed and verified, update the `TODO.md` file. Mark Original Task ID: TBUG_AMAZON_CRASH as [x] in TODO.md.
    - **Depends On:** [T028]
    - **AC Ref:** None