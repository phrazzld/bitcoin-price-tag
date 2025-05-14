# Todo

## Project Setup
- [x] **T001 · Chore · P0: initialize pnpm project**
    - **Context:** Detailed Build Steps / 1. Project Setup & TypeScript
    - **Action:**
        1. Run `pnpm init` in the project root.
    - **Done-when:**
        1. `package.json` is created with basic metadata.
    - **Verification:**
        1. Confirm `package.json` exists and has a valid structure.
    - **Depends-on:** none

- [x] **T002 · Chore · P0: install typescript and type definitions**
    - **Context:** Detailed Build Steps / 1. Project Setup & TypeScript
    - **Action:**
        1. Run `pnpm add -D typescript @types/chrome @types/node`.
    - **Done-when:**
        1. Dependencies are listed in `devDependencies` in `package.json` and installed in `node_modules/`.
    - **Verification:**
        1. Verify installation with `pnpm list`.
    - **Depends-on:** [T001]

- [x] **T003 · Chore · P0: create and configure tsconfig.json**
    - **Context:** Detailed Build Steps / 1. Project Setup & TypeScript
    - **Action:**
        1. Create `tsconfig.json` with `strict: true`, `target: "ES2020"`, `module: "ESNext"`, `moduleResolution: "Bundler"`, `outDir: "./dist"`, `rootDir: "./src"`.
    - **Done-when:**
        1. `tsconfig.json` exists with the specified configuration.
    - **Verification:**
        1. Run `pnpm exec tsc --noEmit` to check for configuration errors.
    - **Depends-on:** [T002]

- [ ] **T004 · Chore · P0: create source directory structure**
    - **Context:** Detailed Build Steps / 1. Project Setup & TypeScript
    - **Action:**
        1. Create directories: `src/service-worker`, `src/content-script`, `src/common`, `src/shared`.
    - **Done-when:**
        1. All specified directories exist under `src/`.
    - **Verification:**
        1. Verify folder structure via file system.
    - **Depends-on:** none

- [ ] **T005 · Chore · P0: add .gitignore file**
    - **Context:** Detailed Build Steps / 1. Project Setup & TypeScript
    - **Action:**
        1. Create `.gitignore` file in the project root.
        2. Add `node_modules/` and `dist/` to the `.gitignore`.
    - **Done-when:**
        1. `.gitignore` exists and includes the specified entries.
    - **Verification:**
        1. `git status` correctly ignores `node_modules/` and `dist/` directories.
    - **Depends-on:** none

- [ ] **T006 · Chore · P1: add basic typescript build script to package.json**
    - **Context:** Detailed Build Steps / 1. Project Setup & TypeScript
    - **Action:**
        1. Add `"build": "tsc"` to the `scripts` section in `package.json`.
    - **Done-when:**
        1. `package.json` contains the build script.
    - **Verification:**
        1. Run `pnpm build` (it may not produce output if `src/` is empty but should not error due to script definition).
    - **Depends-on:** [T001, T003]

## Manifest V3 Conversion
- [ ] **T007 · Refactor · P0: copy manifest.json and update manifest_version**
    - **Context:** Detailed Build Steps / 2. Manifest V3 Conversion
    - **Action:**
        1. Copy existing `manifest.json` to `src/`.
        2. Update `manifest_version` to `3` in `src/manifest.json`.
    - **Done-when:**
        1. `src/manifest.json` exists with `manifest_version: 3`.
    - **Verification:**
        1. Load the extension in Chrome and check for Manifest V3 compatibility.
    - **Depends-on:** [T004]

- [ ] **T008 · Refactor · P0: update manifest background definition for service worker**
    - **Context:** Detailed Build Steps / 2. Manifest V3 Conversion
    - **Action:**
        1. Replace `background` script definition with `"background": { "service_worker": "service-worker/index.js" }` in `src/manifest.json`.
    - **Done-when:**
        1. `src/manifest.json` uses the service worker background definition.
    - **Verification:**
        1. Verify in Chrome DevTools that the service worker loads.
    - **Depends-on:** [T007]

- [ ] **T009 · Refactor · P0: update manifest permissions to minimal set**
    - **Context:** Detailed Build Steps / 2. Manifest V3 Conversion
    - **Action:**
        1. Update `permissions` array in `src/manifest.json` to `["storage", "alarms"]`.
    - **Done-when:**
        1. `src/manifest.json` has the correct minimal permissions.
    - **Verification:**
        1. Check manifest.json content and test extension permissions in Chrome.
    - **Depends-on:** [T007]

- [ ] **T010 · Refactor · P0: add host_permissions for coindesk api to manifest**
    - **Context:** Detailed Build Steps / 2. Manifest V3 Conversion
    - **Action:**
        1. Add `host_permissions` array in `src/manifest.json` with `["*://api.coindesk.com/*"]`.
    - **Done-when:**
        1. `src/manifest.json` has the correct host permissions for CoinDesk API.
    - **Verification:**
        1. Verify API calls work without permission errors.
    - **Depends-on:** [T007]

- [ ] **T011 · Refactor · P0: update content_scripts path and configuration in manifest**
    - **Context:** Detailed Build Steps / 2. Manifest V3 Conversion
    - **Action:**
        1. Update `content_scripts` in `src/manifest.json` to point `js` to `["content-script/index.js"]`.
        2. Ensure `matches` and `run_at` (`document_end`) are correctly configured.
    - **Done-when:**
        1. `src/manifest.json` has correctly configured `content_scripts`.
    - **Verification:**
        1. Test content script injection on a sample page.
    - **Depends-on:** [T007]

## Shared Types & Constants
- [ ] **T012 · Feature · P1: define shared typescript interfaces and types**
    - **Context:** Architecture Blueprint - Public Interfaces / Contracts; Detailed Build Steps - 3. Shared Types & Constants
    - **Action:**
        1. Create `src/common/types.ts`.
        2. Define and export `PriceRequestMessage`, `PriceData`, `PriceResponseMessage`, `LocalStorageCache`, `CoinDeskApiResponse` interfaces.
    - **Done-when:**
        1. `src/common/types.ts` exists and exports all specified types.
        2. Types compile correctly.
    - **Verification:**
        1. Import and use types in dependent modules without errors.
    - **Depends-on:** [T003, T004]

- [ ] **T013 · Feature · P1: define shared constants**
    - **Context:** Architecture Blueprint - Public Interfaces / Contracts; Detailed Build Steps - 3. Shared Types & Constants
    - **Action:**
        1. Create `src/common/constants.ts`.
        2. Define and export `PRICE_CACHE_KEY`, `REFRESH_ALARM_NAME`, `DEFAULT_CACHE_TTL_MS`.
    - **Done-when:**
        1. `src/common/constants.ts` exists and exports all specified constants.
    - **Verification:**
        1. Use constants in code and confirm values are correct.
    - **Depends-on:** [T004]

## Service Worker Implementation
- [ ] **T014 · Feature · P0: implement CoinDesk API fetching logic in service-worker/api.ts**
    - **Context:** Build Step 4, Service Worker Implementation
    - **Action:**
        1. Create `src/service-worker/api.ts`.
        2. Implement `fetchBtcPrice(): Promise<PriceData>` using `fetch`.
        3. Handle API request, response parsing, validation, minimal retry, and error handling.
    - **Done-when:**
        1. Function returns valid `PriceData` or throws structured errors on failure.
    - **Verification:**
        1. Call function and verify API response parsing.
    - **Depends-on:** [T012]

- [ ] **T015 · Feature · P1: implement persistent price cache logic in service-worker/cache.ts**
    - **Context:** Detailed Build Steps - 4. Service Worker Implementation
    - **Action:**
        1. Create `src/service-worker/cache.ts`.
        2. Implement `getCachedPrice(): Promise<PriceData | null>` and `setCachedPrice(data: PriceData): Promise<void>`, including TTL checks and in-memory cache mirror.
        3. Handle `chrome.storage.local` read/write with error handling and data validation.
    - **Done-when:**
        1. Cache functions correctly get, set, and check TTL for price data.
    - **Verification:**
        1. Test cache read/write with simulated data.
    - **Depends-on:** [T012, T013]

- [ ] **T016 · Feature · P1: implement service worker entry point with listeners**
    - **Context:** Detailed Build Steps - 4. Service Worker Implementation
    - **Action:**
        1. Create `src/service-worker/index.ts`.
        2. Add listeners for `chrome.runtime.onInstalled`, `chrome.runtime.onStartup`, `chrome.alarms.onAlarm`, `chrome.runtime.onMessage` with placeholder handlers.
    - **Done-when:**
        1. `src/service-worker/index.ts` is created with all required listeners.
        2. The service worker can be registered by the browser.
    - **Verification:**
        1. Run extension and check for listener callbacks.
    - **Depends-on:** [T012, T013]

- [ ] **T017 · Feature · P1: implement service worker oninstalled handler for alarm creation**
    - **Context:** Detailed Build Steps - 4. Service Worker Implementation
    - **Action:**
        1. Implement `chrome.runtime.onInstalled` handler in `src/service-worker/index.ts` to create the `REFRESH_ALARM_NAME` alarm.
    - **Done-when:**
        1. Alarm is created successfully upon extension installation.
    - **Verification:**
        1. Check Chrome DevTools or logs for alarm creation after install.
    - **Depends-on:** [T013, T016]

- [ ] **T018 · Feature · P1: implement service worker onstartup handler for cache rehydration**
    - **Context:** Detailed Build Steps - 4. Service Worker Implementation
    - **Action:**
        1. Implement `chrome.runtime.onStartup` handler in `src/service-worker/index.ts` to rehydrate in-memory cache from `chrome.storage.local` (if in-memory mirror is used).
    - **Done-when:**
        1. In-memory cache is correctly rehydrated on service worker startup.
    - **Verification:**
        1. Restart browser and check logs for cache rehydration.
    - **Depends-on:** [T015, T016]

- [ ] **T019 · Feature · P1: implement service worker onalarm handler for periodic refresh**
    - **Context:** Detailed Build Steps - 4. Service Worker Implementation
    - **Action:**
        1. Implement `chrome.alarms.onAlarm` handler in `src/service-worker/index.ts` to trigger price refresh using `api.ts` and update cache using `cache.ts`.
    - **Done-when:**
        1. Price data is periodically refreshed and cached when the alarm triggers.
    - **Verification:**
        1. Monitor cache updates at alarm intervals.
    - **Depends-on:** [T013, T014, T015, T016]

- [ ] **T020 · Feature · P1: integrate cache and api in service worker message handler**
    - **Context:** Detailed Build Steps - 4. Service Worker Implementation; Data Flow Diagram
    - **Action:**
        1. Implement the `chrome.runtime.onMessage` handler in `src/service-worker/index.ts` to use `api.ts` and `cache.ts` according to the data flow logic for `PriceRequestMessage`.
    - **Done-when:**
        1. `onMessage` handler correctly processes price requests, manages cache, and calls API as needed.
        2. Correct `PriceResponseMessage` is sent.
    - **Verification:**
        1. Simulate messages and verify responses.
    - **Depends-on:** [T014, T015, T016]

## Content Script Implementation
- [ ] **T021 · Feature · P1: implement content script messaging module**
    - **Context:** Detailed Build Steps - 5. Content Script Implementation
    - **Action:**
        1. Create `src/content-script/messaging.ts`.
        2. Implement `requestPriceData(): Promise<PriceData>` to send `PriceRequestMessage`, handle `PriceResponseMessage`, manage `requestId`, and include timeout logic.
    - **Done-when:**
        1. `requestPriceData` correctly communicates with the service worker and handles responses/errors/timeouts.
    - **Verification:**
        1. Test message sending and receiving.
    - **Depends-on:** [T012]

- [ ] **T022 · Feature · P1: implement dom interaction module**
    - **Context:** Detailed Build Steps - 5. Content Script Implementation
    - **Action:**
        1. Create `src/content-script/dom.ts`.
        2. Implement pure functions (e.g., `findAndAnnotatePrices`) for DOM scanning, price conversion, and DOM mutation, accepting price data as an argument.
    - **Done-when:**
        1. DOM manipulation functions correctly find and annotate prices based on provided data.
    - **Verification:**
        1. Call functions on sample DOM and check mutations.
    - **Depends-on:** [T012]

- [ ] **T023 · Feature · P1: implement content script entry point**
    - **Context:** Detailed Build Steps - 5. Content Script Implementation
    - **Action:**
        1. Create `src/content-script/index.ts`.
        2. Implement logic to trigger price request on load.
    - **Done-when:**
        1. `src/content-script/index.ts` is created and initiates price request.
    - **Verification:**
        1. Inject script and observe behavior on page load.
    - **Depends-on:** [T004]

- [ ] **T024 · Feature · P1: wire content script entry point with messaging and dom modules**
    - **Context:** Detailed Build Steps - 5. Content Script Implementation
    - **Action:**
        1. Update `src/content-script/index.ts` to call `messaging.requestPriceData()` and then `dom.findAndAnnotatePrices()` upon successful price retrieval.
        2. Handle errors gracefully if price retrieval fails.
    - **Done-when:**
        1. Content script correctly orchestrates price request and DOM annotation.
    - **Verification:**
        1. Run script and verify annotation on successful fetch.
    - **Depends-on:** [T021, T022, T023]

## Build Process Refinement
- [ ] **T025 · Chore · P1: enhance build script to clean dist and copy static assets**
    - **Context:** Detailed Build Steps - 6. Build Process Refinement
    - **Action:**
        1. Update `build` script in `package.json` to: clean `dist/`, compile TypeScript (`tsc`), copy `src/manifest.json` to `dist/`, and copy any other static assets (e.g., icons, CSS) to `dist/`.
    - **Done-when:**
        1. `pnpm build` produces a complete and clean `dist/` directory ready for loading as an unpacked extension.
    - **Verification:**
        1. Run `pnpm run build` and inspect `dist/` directory for all necessary files.
    - **Depends-on:** [T006, T007]

## Testing & Verification
- [ ] **T026 · Test · P1: perform initial manual e2e testing and debugging**
    - **Context:** Detailed Build Steps - 7. Initial Testing & Debugging
    - **Action:**
        1. Load unpacked extension from `dist/` in Chrome.
        2. Verify core functionality: price fetch on install/alarm, caching, annotation on page load.
        3. Test error paths (disconnect network, simulate invalid API response).
    - **Done-when:**
        1. Core functionality is verified manually.
        2. Major bugs identified in initial pass are logged or fixed.
    - **Verification:**
        1. Use DevTools to check console logs, network requests, and `chrome.storage.local`.
    - **Depends-on:** [T020, T024, T025]

- [ ] **T027 · Test · P1: set up test runner (vitest or jest)**
    - **Context:** Testing Strategy - Unit Tests
    - **Action:**
        1. Install chosen test runner (e.g., `pnpm add -D vitest`).
        2. Configure test runner for TypeScript and project structure.
        3. Add test script to `package.json` (e.g., `"test": "vitest"`).
    - **Done-when:**
        1. Test runner is installed and configured.
        2. `pnpm test` can execute (even if no tests exist yet).
    - **Verification:**
        1. Run test command and verify it works.
    - **Depends-on:** [T001]

- [ ] **T028 · Test · P1: write unit tests for api.ts**
    - **Context:** Testing Strategy - Unit Tests
    - **Action:**
        1. Mock `fetch`.
        2. Test API parsing, error handling for various response codes/formats, and retry logic.
    - **Done-when:**
        1. Unit tests for `api.ts` achieve >90% coverage and pass.
    - **Verification:**
        1. Run tests and check coverage report.
    - **Depends-on:** [T014, T027]

- [ ] **T029 · Test · P1: write unit tests for cache.ts**
    - **Context:** Testing Strategy - Unit Tests
    - **Action:**
        1. Mock `chrome.storage.local`.
        2. Test get/set logic, TTL calculations, cache hydration, and storage error handling.
    - **Done-when:**
        1. Unit tests for `cache.ts` achieve >90% coverage and pass.
    - **Verification:**
        1. Run tests and verify TTL logic.
    - **Depends-on:** [T015, T027]

- [ ] **T030 · Test · P1: write unit tests for dom.ts**
    - **Context:** Testing Strategy - Unit Tests
    - **Action:**
        1. Test regex matching, price conversion, and DOM structure modification logic (using mock DOM elements if needed).
    - **Done-when:**
        1. Unit tests for `dom.ts` pure functions achieve >90% coverage and pass.
    - **Verification:**
        1. Run tests on mock DOM elements.
    - **Depends-on:** [T022, T027]

- [ ] **T031 · Test · P1: write unit tests for service-worker/index.ts handlers**
    - **Context:** Testing Strategy - Unit Tests
    - **Action:**
        1. Mock `cache.ts`, `api.ts`, `chrome.runtime`, `chrome.alarms`.
        2. Verify correct functions are called based on messages/alarms.
    - **Done-when:**
        1. Unit tests for SW event handlers achieve >80% coverage and pass.
    - **Verification:**
        1. Run tests and verify handler calls.
    - **Depends-on:** [T016, T017, T018, T019, T020, T027]

- [ ] **T032 · Test · P1: write integration tests for service worker <-> content script communication**
    - **Context:** Testing Strategy - Integration Tests
    - **Action:**
        1. Mock `chrome.runtime.sendMessage` and `onMessage` listeners.
        2. Send a message from a mock CS context, assert the SW mock responds correctly based on mock cache/API state, and vice-versa.
    - **Done-when:**
        1. Integration tests for message passing achieve >80% coverage and pass.
    - **Verification:**
        1. Run tests and assert responses.
    - **Depends-on:** [T020, T021, T027]

- [ ] **T033 · Test · P2: test service worker restart scenarios for state persistence**
    - **Context:** Risk Matrix - Service Worker Lifecycle Unpredictability
    - **Action:**
        1. Manually or programmatically (if test framework allows) force service worker restarts.
        2. Verify that state persisted in `chrome.storage.local` is correctly reloaded/used.
        3. Verify that alarms persist and trigger correctly after restart.
    - **Done-when:**
        1. Service worker correctly recovers state and alarm functionality after restarts.
    - **Verification:**
        1. Observe logs and extension behavior after SW restarts.
    - **Depends-on:** [T015, T017, T019, T026]

## Logging & Observability
- [ ] **T034 · Feature · P2: implement lightweight structured logging utility**
    - **Context:** Architecture Blueprint - Optional Shared Logger
    - **Action:**
        1. Create `src/shared/logger.ts`.
        2. Implement a simple wrapper around `console.log/warn/error` that can prepend context (e.g., module name, timestamp) or log structured objects.
    - **Done-when:**
        1. `src/shared/logger.ts` provides basic structured logging functions.
    - **Verification:**
        1. Import and use logger, check console output format.
    - **Depends-on:** [T004]

- [ ] **T035 · Chore · P2: add structured logging to service worker modules**
    - **Context:** Logging & Observability - Log Events & Structured Fields (Service Worker)
    - **Action:**
        1. Import and use the logging utility (or `console` directly if T034 is deferred) in `src/service-worker/index.ts`, `cache.ts`, `api.ts`.
        2. Add log statements for specified events with structured fields.
    - **Done-when:**
        1. Service worker logs key events with relevant data as per plan.
    - **Verification:**
        1. Run extension and check console output.
    - **Depends-on:** [T014, T015, T016, T034]

- [ ] **T036 · Chore · P2: add structured logging to content script modules**
    - **Context:** Logging & Observability - Log Events & Structured Fields (Content Script)
    - **Action:**
        1. Import and use the logging utility (or `console` directly) in `src/content-script/index.ts`, `messaging.ts`.
        2. Add log statements for specified events with structured fields.
    - **Done-when:**
        1. Content script logs key events with relevant data as per plan.
    - **Verification:**
        1. Inject script and verify logs.
    - **Depends-on:** [T021, T023, T034]

- [ ] **T037 · Refactor · P2: propagate and log requestId for all messaging events**
    - **Context:** Logging & Observability - Correlation ID Propagation
    - **Action:**
        1. Ensure `requestId` is generated in content script, sent in messages, and included in all logs and responses.
    - **Done-when:**
        1. All log lines relevant to a request include its `requestId`.
    - **Verification:**
        1. Trace a request from CS to SW and back via logs.
    - **Depends-on:** [T020, T021, T035, T036]

## Security & Config
- [ ] **T038 · Chore · P1: implement API response validation in api.ts**
    - **Context:** Security & Config - Input Validation Hotspots
    - **Action:**
        1. Add structure validation in `fetchBtcPrice` before parsing the API response.
        2. Ensure `response.bpi.USD.rate_float` exists and is a number.
    - **Done-when:**
        1. Validation checks and errors are handled, invalid responses never cause exceptions.
    - **Verification:**
        1. Test with invalid responses and check error handling.
    - **Depends-on:** [T014]

- [ ] **T039 · Chore · P1: implement storage data validation in cache.ts**
    - **Context:** Security & Config - Input Validation Hotspots
    - **Action:**
        1. Add validation for cached data read from `chrome.storage.local`.
        2. Handle data corruption gracefully (treat as cache miss).
    - **Done-when:**
        1. Invalid data is treated as cache miss.
    - **Verification:**
        1. Test with corrupted storage data.
    - **Depends-on:** [T015]

- [ ] **T040 · Refactor · P1: review and minimize permissions and content script matches in manifest**
    - **Context:** Security & Config - Least-Privilege Notes
    - **Action:**
        1. Audit manifest for principle of least privilege.
        2. Narrow content script matches if possible.
    - **Done-when:**
        1. Manifest permissions and host matches are as minimal as possible while maintaining functionality.
    - **Verification:**
        1. Extension operates on intended sites and passes Chrome review.
    - **Depends-on:** [T007, T008, T009, T010, T011]

## Documentation
- [ ] **T041 · Chore · P2: add TSDoc to exported functions, types, interfaces, and constants**
    - **Context:** Documentation - Code Self-Doc Patterns
    - **Action:**
        1. Add TSDoc (`/** ... */`) for all exported functions, classes, types, interfaces, and constants.
        2. Explain purpose, parameters (`@param`), return values (`@returns`), and potential errors (`@throws`).
    - **Done-when:**
        1. All exports have descriptions.
    - **Verification:**
        1. Use IDE to view generated docs.
    - **Depends-on:** [T012, T013, T014, T015, T021, T022]

- [ ] **T042 · Chore · P2: update README.md with MV3 architecture, setup, and rationale**
    - **Context:** Documentation - README.md Updates
    - **Action:**
        1. Document the new MV3 architecture (SW, CS, storage, messaging flow).
        2. Include or link to the architecture diagram.
        3. Update build/development setup instructions (`pnpm install`, `pnpm build`).
        4. Explain the rationale for the migration and key design choices.
    - **Done-when:**
        1. README includes diagram and setup instructions.
    - **Verification:**
        1. Review README for completeness and clarity.
    - **Depends-on:** [T026]

## Open Questions & Risk Management
- [ ] **T043 · Chore · P1: make BTC price cache TTL configurable in constants**
    - **Context:** Open Questions - TTL for BTC price cache
    - **Action:**
        1. Ensure `DEFAULT_CACHE_TTL_MS` in `constants.ts` is used consistently.
        2. Add comments explaining its purpose and how to adjust it.
    - **Done-when:**
        1. TTL can be easily adjusted in one place.
    - **Verification:**
        1. Change TTL value and verify it takes effect.
    - **Depends-on:** [T013]

- [ ] **T044 · Chore · P2: document approach for content script price fetch failure handling**
    - **Context:** Open Questions - Visual indication of failure
    - **Action:**
        1. Document decision on how to handle price fetch failures (silent logging vs visual indicator).
        2. Implement the chosen approach in content script.
    - **Done-when:**
        1. Failure handling is documented and implemented.
    - **Verification:**
        1. Test with network errors and verify behavior.
    - **Depends-on:** [T024]

- [ ] **T045 · Clarification · P2: identify high-priority websites for testing**
    - **Context:** Open Questions - High-priority websites
    - **Action:**
        1. Compile list of websites where the extension is frequently used.
        2. Include these in test plan for manual verification.
    - **Done-when:**
        1. Test plan includes priority sites or confirms none exist.
    - **Verification:**
        1. Test extension on identified websites.
    - **Depends-on:** [T026]
    - **Blocking?:** no

- [ ] **T046 · Feature · P1: implement robust error handling for API changes/failures**
    - **Context:** Risk Matrix - CoinDesk API Changes/Failures/Rate Limits
    - **Action:**
        1. Enhance error strategies in api.ts.
        2. Implement response validation and structured error types.
    - **Done-when:**
        1. API errors are handled gracefully with fallbacks to stale data when available.
    - **Verification:**
        1. Test with mocked API failures.
    - **Depends-on:** [T014, T015]