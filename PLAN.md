# Plan: Migrate Bitcoin Price Tag Extension to Manifest V3

## Chosen Approach (One‑liner)

Implement the Manifest V3 migration using the "Service Worker as a Caching API Layer" architecture, leveraging `chrome.storage.local` for persistent caching and `chrome.alarms` for periodic data refresh, with minimal TypeScript setup for type safety and maintainability.

## Architecture Blueprint

-   **Modules / Packages**
    -   `src/service-worker/`: Handles background tasks, API fetching, caching, and responding to messages.
        -   `index.ts`: Service worker entry point, sets up listeners (messages, alarms, install/startup).
        -   `api.ts`: Responsible solely for fetching BTC price from the CoinDesk API and parsing the response.
        -   `cache.ts`: Manages price data cache (get, set, TTL check) interacting with `chrome.storage.local` and an optional in-memory mirror for performance.
    -   `src/content-script/`: Handles DOM interaction, requesting price data, and annotating the page.
        -   `index.ts`: Content script entry point, orchestrates price request and DOM annotation.
        -   `dom.ts`: Contains pure logic for scanning the DOM using regex, converting prices, and performing DOM mutations for annotation. Accepts price data explicitly.
        -   `messaging.ts`: Handles sending messages to the service worker and receiving/parsing responses.
    -   `src/common/`: Shared types, interfaces, constants, and potentially lightweight utilities.
        -   `types.ts`: Defines shared TypeScript interfaces/types for messages (`PriceRequestMessage`, `PriceResponseMessage`), cache structure (`PriceData`, `LocalStorageCache`), and potentially API responses (`CoinDeskApiResponse`).
        -   `constants.ts`: Defines constants like storage keys, alarm names, TTL values.
    -   `src/shared/logger.ts`: (Optional but Recommended) Lightweight, structured logging utility.

-   **Public Interfaces / Contracts**

    ```typescript
    // src/common/types.ts

    export interface PriceRequestMessage {
      type: 'GET_BTC_PRICE';
      requestId: string; // Unique ID for request/response correlation
    }

    // Price data structure stored in cache and sent in response
    export interface PriceData {
      usdRate: number; // BTC price in USD
      fetchedAt: number; // Unix timestamp (ms) of when the price was fetched
    }

    // Response from Service Worker to Content Script
    export type PriceResponseMessage = {
        type: 'BTC_PRICE_RESPONSE';
        requestId: string;
        ok: true;
        data: PriceData & { isStale?: boolean }; // Include fetched data, optionally mark if stale
      } | {
        type: 'BTC_PRICE_RESPONSE';
        requestId: string;
        ok: false;
        error: string; // Description of the error
      };

    // Cache structure in chrome.storage.local
    export interface LocalStorageCache {
      btcPriceData?: PriceData;
    }

    // CoinDesk API Response structure (simplified example)
    export interface CoinDeskApiResponse {
      time: {
        updatedISO: string;
      };
      bpi: {
        USD: {
          rate_float: number;
        };
      };
    }

    // src/common/constants.ts
    export const PRICE_CACHE_KEY = 'btcPriceCache';
    export const REFRESH_ALARM_NAME = 'refreshBtcPriceAlarm';
    export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    ```

-   **Data Flow Diagram** (Mermaid Sequence Diagram)

    ```mermaid
    sequenceDiagram
        participant CS as Content Script
        participant SW as Service Worker
        participant Store as chrome.storage.local
        participant Alarm as chrome.alarms
        participant API as CoinDesk API

        Note over SW: Service Worker activates (install/startup/alarm/message)
        SW->>Store: Read cached PriceData on startup (if exists)

        opt Periodic Refresh
            Alarm->>SW: Trigger REFRESH_ALARM_NAME
            SW->>API: Fetch BTC Price (api.ts)
            API-->>SW: Return API Response
            alt API Success
                SW->>SW: Process Response, get PriceData
                SW->>Store: Write new PriceData (cache.ts)
            else API Failure
                SW->>SW: Log error
            end
        end

        CS->>SW: Send PriceRequestMessage (messaging.ts)
        SW->>Store: Read cached PriceData (cache.ts)
        alt Cache Hit and Valid TTL
            Store-->>SW: Return PriceData
            SW->>CS: Send PriceResponseMessage (ok: true, data: PriceData)
        else Cache Miss or Stale TTL
            SW->>API: Fetch BTC Price (api.ts)
            API-->>SW: Return API Response
            alt API Success
                SW->>SW: Process Response, get PriceData
                SW->>Store: Write new PriceData (cache.ts)
                SW->>CS: Send PriceResponseMessage (ok: true, data: PriceData)
            else API Failure
                SW->>Store: Read stale PriceData (if exists)
                alt Stale data exists
                     Store-->>SW: Return stale PriceData
                     SW->>CS: Send PriceResponseMessage (ok: true, data: stale PriceData, isStale: true)
                else No data available
                     SW->>CS: Send PriceResponseMessage (ok: false, error: 'API fetch failed and no cache available')
                end
            end
        end

        CS->>CS: Receive PriceResponseMessage (messaging.ts)
        alt Success
            CS->>CS: Use PriceData for DOM annotation (dom.ts)
        else Failure
            CS->>CS: Log error, handle gracefully (no annotations)
        end
    ```

-   **Error & Edge‑Case Strategy**
    -   **API Fetch Failure (SW):** Log error (`api.ts`). `cache.ts` attempts to serve stale data from `chrome.storage.local` if available (marking it as stale). If no data, respond to CS with `ok: false` and error message. Implement minimal retry (e.g., 1 retry after 5s) within `api.ts` for transient network issues. Validate API response structure; treat validation failure as fetch failure.
    -   **Cache Read/Write Failure (SW):** Log error (`cache.ts`). On read failure, proceed as cache miss. On write failure, log but continue (price may be available in SW memory for its lifetime, but won't persist).
    -   **Message Send/Receive Failure (CS/SW):** Wrap `sendMessage` calls in `try/catch`. CS should handle potential promise rejection from `messaging.ts` (e.g., if SW doesn't respond or port closes) and log/abort annotation. SW should wrap message sending and log errors if sending fails (e.g., tab closed).
    -   **Content Script Receives Error:** Log the error. Gracefully abort annotation for the current page load. Do not modify the DOM.
    -   **Service Worker Termination:** State persists in `chrome.storage.local`. On SW restart (`onStartup`), `cache.ts` should rehydrate the in-memory cache. Alarms persist across restarts.
    -   **Stale Data:** If API fails but stale data exists, serve it but include `isStale: true` in the response. CS can choose how to handle this (e.g., log, potentially indicate staleness visually - TBD).
    -   **Concurrency:** Service worker processes messages mostly serially. Multiple tabs requesting simultaneously will likely queue. Fetching logic should handle potential redundant fetches gracefully (e.g., if fetch already in progress, await existing promise or rely on TTL check).

## Detailed Build Steps

1.  **Project Setup & TypeScript:**
    *   Initialize `pnpm` project: `pnpm init`.
    *   Install dev dependencies: `pnpm add -D typescript @types/chrome @types/node`.
    *   Create `tsconfig.json`: Configure with `strict: true`, `target: "ES2020"`, `module: "ESNext"`, `moduleResolution: "Bundler"`, `outDir: "./dist"`, `rootDir: "./src"`. Ensure strict type checking options are enabled.
    *   Add build script to `package.json`: `"build": "tsc"`.
    *   Create source directory structure: `src/service-worker`, `src/content-script`, `src/common`.
    *   Add `.gitignore` for `node_modules/`, `dist/`.
2.  **Manifest V3 Conversion:**
    *   Copy existing `manifest.json` to `src/`.
    *   Update `manifest_version` to `3`.
    *   Replace `background` script definition with `"background": { "service_worker": "service-worker/index.js" }`.
    *   Update `permissions`: Ensure only necessary permissions remain: `"permissions": ["storage", "alarms"]`.
    *   Update `host_permissions`: Add `"host_permissions": ["*://api.coindesk.com/*"]`. Remove overly broad permissions like `*://*/*` unless absolutely required for content script matching (prefer more specific matches if possible).
    *   Update `content_scripts`: Point `js` array to compiled output, e.g., `["content-script/index.js"]`. Ensure `matches`, `run_at` (`document_end` likely appropriate) are correct.
3.  **Shared Types & Constants:**
    *   Define interfaces/types in `src/common/types.ts` as specified in Architecture Blueprint.
    *   Define constants in `src/common/constants.ts`.
4.  **Service Worker Implementation:**
    *   Create `src/service-worker/index.ts`: Add listeners for `chrome.runtime.onInstalled` (initial setup, create alarm), `chrome.runtime.onStartup` (rehydrate cache), `chrome.alarms.onAlarm` (trigger refresh), `chrome.runtime.onMessage` (handle price requests).
    *   Create `src/service-worker/api.ts`: Implement `fetchBtcPrice(): Promise<PriceData>` using `fetch`, handle CoinDesk API specifics, parsing, basic retry, and error handling. Return structured `PriceData` or throw specific errors.
    *   Create `src/service-worker/cache.ts`: Implement `getCachedPrice(): Promise<PriceData | null>`, `setCachedPrice(data: PriceData): Promise<void>`. Include TTL check logic against `fetchedAt`. Manage interaction with `chrome.storage.local` and optional in-memory cache. Handle storage errors.
    *   Integrate `cache.ts` and `api.ts` into `index.ts` message/alarm handlers according to the data flow logic.
5.  **Content Script Implementation:**
    *   Create `src/content-script/index.ts`: Entry point. Import messaging helper. Trigger price request on load. Handle response/error.
    *   Create `src/content-script/messaging.ts`: Implement `requestPriceData(): Promise<PriceData>`. Generates `requestId`, sends `PriceRequestMessage`, handles `PriceResponseMessage`, resolves/rejects promise. Includes timeout logic (e.g., 10 seconds) in case SW fails to respond.
    *   Create `src/content-script/dom.ts`: Port existing DOM scanning (regex) and annotation logic into pure functions (e.g., `findAndAnnotatePrices(rootElement: HTMLElement, priceData: PriceData)`). Ensure it accepts price data as an argument and has no side effects beyond DOM mutation. Remove all global state dependencies.
    *   Wire `index.ts` to call `messaging.ts` and then `dom.ts` upon successful price retrieval.
6.  **Build Process Refinement:**
    *   Enhance `package.json` build script to clean `dist`, compile TS, and copy static assets (`manifest.json`, icons, CSS if any) into `dist/`. Example: `"build": "rm -rf dist && tsc && cp src/manifest.json dist/ && cp -r src/icons dist/"` (adjust copy commands for cross-platform compatibility or use a tool like `cpy-cli`).
7.  **Initial Testing & Debugging:**
    *   Load unpacked extension from `dist/` in Chrome.
    *   Use DevTools (Inspect Service Worker background context, content script context) to check console logs, network requests, and storage (`Application` -> `Storage` -> `Extension Storage`).
    *   Verify core functionality: price fetch on install/alarm, caching, annotation on page load. Test error paths (disconnect network, invalid API response).

## Testing Strategy

-   **Test Layers:**
    -   **Unit Tests:** Test individual modules/functions in isolation. Use a test runner like Vitest or Jest.
        -   `api.ts`: Mock `fetch`. Test API parsing, error handling for various response codes/formats.
        -   `cache.ts`: Mock `chrome.storage.local`. Test get/set logic, TTL calculations, cache hydration.
        -   `dom.ts`: Test regex matching, price conversion, and potentially DOM structure modification logic (using mock DOM elements if needed).
        -   `service-worker/index.ts` handlers: Mock `cache.ts`, `api.ts`, `chrome.runtime`, `chrome.alarms`. Verify correct functions are called based on messages/alarms.
    -   **Integration Tests:** Verify interactions between key components, primarily message passing.
        -   SW <-> CS communication: Mock `chrome.runtime.sendMessage` and `onMessage` listeners. Send a message from a mock CS context, assert the SW mock responds correctly based on mock cache/API state, and vice-versa. Libraries like `jest-chrome` can facilitate mocking Chrome APIs.
    -   **Manual E2E Tests:** Crucial for initial validation. Load the extension in a browser, navigate to various websites with currency amounts, verify correct annotation, check SW logs/storage, test behavior after browser restart or SW inactivity.
-   **What to Mock:**
    -   **True Externals Only:** `fetch` (global), `chrome.*` APIs (`storage`, `alarms`, `runtime`). Mocking these boundaries is permitted and necessary for unit/integration testing.
    -   **No Internal Mocking:** Do not mock functions within the same module or other internal project modules during integration tests (e.g., don't mock `cache.ts` when testing the full SW message handler flow in an integration test, only mock the `chrome.*` APIs it uses).
-   **Coverage Targets & Edge Cases:**
    -   Aim for >90% unit test coverage for core logic (`api.ts`, `cache.ts`, `dom.ts` pure functions).
    -   Aim for >80% coverage for SW event handlers and CS messaging logic.
    -   Focus tests on edge cases: API errors (network, bad response), empty/stale cache, storage errors, SW restart scenarios, message timeouts, race conditions (minimal risk but consider).

## Logging & Observability

-   Use `console.log/warn/error` initially. Consider adopting a lightweight structured logging wrapper (`src/shared/logger.ts`) later.
-   **Log Events & Structured Fields:**
    -   **Service Worker (`service-worker/index.ts`, `cache.ts`, `api.ts`):**
        -   `INFO`: SW Activation (`reason: install|startup|alarm|message`).
        -   `INFO`: Alarm Created/Triggered (`alarmName`).
        -   `INFO`: Message Received (`type`, `senderId`, `requestId`).
        -   `DEBUG`: Cache Check (`key`, `cacheHit`, `isStale`).
        -   `INFO`: Fetching Price (`url`).
        -   `INFO`: API Fetch Success (`url`, `rate`, `fetchTimeMs`).
        -   `ERROR`: API Fetch Failed (`url`, `error`, `status?`).
        -   `DEBUG`: Cache Write (`key`, `rate`, `timestamp`).
        -   `ERROR`: Storage Operation Failed (`operation: get|set`, `key`, `error`).
        -   `INFO`: Sending Response (`type`, `ok`, `recipientId`, `requestId`).
        -   `ERROR`: Failed to Send Response (`type`, `recipientId`, `requestId`, `error`).
    -   **Content Script (`content-script/index.ts`, `messaging.ts`):**
        -   `INFO`: Script Injected.
        -   `INFO`: Sending Price Request (`requestId`).
        -   `INFO`: Received Price Response (`ok`, `rate?`, `isStale?`, `requestId`).
        -   `ERROR`: Failed to Get Price Response (`error`, `requestId`).
        -   `DEBUG`: Starting DOM Annotation.
        -   `DEBUG`: Finished DOM Annotation (`annotationsCount`).
-   **Correlation ID Propagation:** Use `requestId` generated by the content script in request messages, include it in all related SW logs and the response message back to the CS.

## Security & Config

-   **Input Validation Hotspots:**
    -   **CoinDesk API Response (`api.ts`):** Strictly validate the structure before parsing (e.g., `response.bpi.USD.rate_float` exists and is a number). Log and throw error on invalid structure.
    -   **Storage Data (`cache.ts`):** Validate data read from `chrome.storage.local` matches the expected `PriceData` interface on SW startup/read. Handle potential corruption gracefully (treat as cache miss).
    -   **Messages:** Basic validation of `message.type` in listeners. As messages are internal, deep validation is less critical but type safety helps.
-   **Secrets Handling:** N/A. The CoinDesk API used is public and does not require keys. Ensure no secrets are ever hardcoded if requirements change.
-   **Least-Privilege Notes:**
    -   Manifest `permissions`: Confirmed minimal (`storage`, `alarms`).
    -   Manifest `host_permissions`: Confirmed minimal (`*://api.coindesk.com/*`). Avoid `*://*/*` unless justified and documented.
    -   Content Script `matches`: Use the most specific patterns possible for target websites. `*://*/*` provides broad functionality but increases attack surface if vulnerabilities exist in the script. Review if scope can be narrowed.

## Documentation

-   **Code Self-Doc Patterns:**
    -   Use TSDoc (`/** ... */`) for all exported functions, classes, types, interfaces, and constants. Explain purpose, parameters (`@param`), return values (`@returns`), and potential errors (`@throws`).
    -   Use clear, intention-revealing names for variables, functions, and modules.
-   **README.md Updates:**
    -   Document the new MV3 architecture (SW, CS, storage, messaging flow). Include or link to the architecture diagram.
    -   Update build/development setup instructions (`pnpm install`, `pnpm build`).
    -   Explain the rationale for the migration and key design choices.

## Risk Matrix

| Risk                                         | Severity | Mitigation                                                                                                                                |
| :------------------------------------------- | :------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome MV2 Deprecation Deadline Missed       | Critical | Prioritize this task. Keep scope strictly focused on migration essentials. Defer non-essential features/refactors.                           |
| Service Worker Lifecycle Unpredictability    | Medium   | Rely on `chrome.storage.local` for all essential state persistence. Use `chrome.alarms` for reliable periodic execution. Test SW restarts. |
| CoinDesk API Changes/Failures/Rate Limits    | Medium   | Implement robust error handling, validate responses. Serve stale cache as fallback. Monitor API status. Consider abstracting API calls.      |
| Message Passing Complexity/Errors            | Medium   | Use clear TypeScript contracts (`types.ts`). Implement `requestId` for correlation. Handle errors/timeouts in CS messaging logic. Test contract. |
| Regression in DOM Annotation Logic           | Medium   | Isolate DOM logic (`dom.ts`), write unit tests for core conversion/regex. Perform thorough manual testing on diverse websites.            |
| Incorrect/Incomplete V3 Manifest/Permissions | High     | Follow official Chrome migration guides meticulously. Test loading/functionality on target Chrome versions. Address all console warnings. |
| `chrome.storage` Latency/Errors/Limits       | Low      | Implement error handling for all storage calls. Usage is low volume; unlikely to hit quotas. Use in-memory SW cache to reduce reads.      |
| Build/Tooling Complexity                     | Low      | Start with minimal TS config/build scripts (`tsc`, basic copy). Avoid complex bundlers unless strictly necessary for this phase.          |

## Open Questions

-   What is the definitive acceptable Time-To-Live (TTL) for the BTC price cache? (Using 5 minutes as initial default, make easily configurable in `constants.ts`).
-   How should the Content Script visually indicate failure to retrieve price data (if at all)? (Current plan: log error, do nothing visually).
-   Are there specific high-priority websites known to be problematic for the existing annotation logic that require targeted testing post-migration?
-   Should the Service Worker proactively push price updates to existing content scripts after a refresh, or only provide data when requested? (Current plan: CS requests on load/refresh for simplicity).
-   Is the current CoinDesk API endpoint (`v1/bpi/currentprice.json`) the most suitable, or should alternatives be considered for stability/features? (Stick with current for migration scope).