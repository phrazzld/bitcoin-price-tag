# Plan: Align Tests, Mocks, Build Script, and Documentation with CoinGecko API

## Chosen Approach (One‑liner)
Systematically update all test mocks, test data, documentation, and the build script's host permission check to use the CoinGecko API URL, response structure, and permissions, ensuring strict environment parity and reliable verification.

## Architecture Blueprint

This plan primarily addresses inconsistencies in testing, build verification components, and documentation, rather than altering core application architecture. The existing production architecture, where `src/service-worker/api.ts` handles CoinGecko API interaction, remains unchanged.

-   **Modules / Packages**
    -   `src/service-worker/api.ts`: Contains production API fetching logic (already uses CoinGecko).
    -   `src/service-worker/api.test.ts`: Unit tests for the API client. → Responsibility: Verify `api.ts` correctly interacts with the (mocked) CoinGecko API and processes its responses.
    -   `tests/mocks/fetch.ts`: Global fetch mock. → Responsibility: Simulate CoinGecko API responses (both success and error) for testing purposes.
    -   `verify-build.js`: Build verification script. → Responsibility: Validate `manifest.json` contents, specifically the `host_permissions` for CoinGecko.
    -   `README.md`: Project overview and developer documentation. → Responsibility: Accurately reflect current API dependencies (CoinGecko).
    -   `MANIFEST_V3_APPROACHES.md`: Documentation on V3 migration decisions. → Responsibility: Accurately reflect current API dependencies and permissions.
    -   `src/common/types.ts`: Contains type definitions, including `CoinGeckoApiResponse`.

-   **Public Interfaces / Contracts**
    -   `CoinGeckoApiResponse` (as defined in `src/common/types.ts`):
        ```typescript
        // Assumed structure based on common CoinGecko usage for price
        export interface CoinGeckoApiResponse {
          readonly bitcoin: {
            readonly usd: number;
            // Potentially other currencies or details if used
          };
          // Potentially other coins if the request is for multiple IDs
        }
        ```
    -   Mocked `fetch` interface (in `tests/mocks/fetch.ts`):
        The `createFetchMock`, `mockFetchPrice`, `mockFetchError` functions will be updated to return `Response` objects that, when `json()` is called, resolve to `CoinGeckoApiResponse` or simulated error structures matching CoinGecko's behavior.
    -   `verify-build.js` contract: Exits with status 0 if `manifest.json` host permissions correctly include `*://api.coingecko.com/*`; otherwise, exits with non-zero status and logs an error.

-   **Data Flow Diagram** (for testing `src/service-worker/api.ts`)
    ```mermaid
    sequenceDiagram
        participant Test as api.test.ts
        participant MockFetch as tests/mocks/fetch.ts
        participant ApiClient as src/service-worker/api.ts

        Test->>ApiClient: Call fetchBtcPrice()
        ApiClient->>MockFetch: fetch(COINGECKO_API_URL, options)
        MockFetch-->>ApiClient: Mocked CoinGecko Response (JSON)
        ApiClient->>ApiClient: Validate & Process Response (using CoinGecko structure)
        ApiClient-->>Test: PriceData or ApiError
    ```

-   **Error & Edge‑Case Strategy**
    -   `api.test.ts`: Must include test cases for various CoinGecko API error scenarios (e.g., network errors, HTTP 4xx/5xx error codes, malformed/unexpected JSON responses, rate limits) as simulated by `tests/mocks/fetch.ts`.
    -   `tests/mocks/fetch.ts`: Must be capable of simulating these error scenarios accurately.
    -   `verify-build.js`: Will fail the build if `manifest.json` does not contain the correct `*://api.coingecko.com/*` host permission.

## Detailed Build Steps

1.  **Correct Manifest Host Permissions Check in Build Script (`verify-build.js`)**:
    *   Locate `verify-build.js`.
    *   On or around line 69 (as indicated in context), modify the logic that checks `host_permissions`.
    *   Change the expected host permission string from `*://api.coindesk.com/*` to `*://api.coingecko.com/*`.
    *   Ensure error messages clearly state that `*://api.coingecko.com/*` is expected.
    *   Verify the script correctly reads `host_permissions` from the `dist/manifest.json` file.

2.  **Update Mock Fetch Implementation (`tests/mocks/fetch.ts`)**:
    *   Replace any `CoinDeskApiResponse` type usage with `CoinGeckoApiResponse` (imported from `src/common/types.ts` or a local definition if more appropriate for the mock).
    *   Update the mock `fetch` implementation and helper functions (`createFetchMock`, `mockFetchPrice`, `mockFetchError`) to generate data conforming to `CoinGeckoApiResponse` structure. For example, a successful price response for Bitcoin in USD:
        ```json
        { "bitcoin": { "usd": 50000.00 } }
        ```
    *   Ensure the mock can simulate various HTTP error statuses (e.g., 400, 403, 404, 429, 500) and network failures.
    *   Remove any CoinDesk-specific mock data or logic.

3.  **Update API Unit Tests (`src/service-worker/api.test.ts`)**:
    *   Ensure the API URL used in tests (if hardcoded or configured in tests) points to the correct CoinGecko endpoint (e.g., `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`). Ideally, this should use the same constant as the production `api.ts`.
    *   Replace any usage of mock `CoinDeskApiResponse` data with `CoinGeckoApiResponse` data in test setup and assertions.
    *   Adjust assertions to expect `PriceData` derived from the CoinGecko response structure (e.g., price extracted from `data.bitcoin.usd`).
    *   Update tests for `validateApiResponse` (if this helper is tested directly) to use CoinGecko's format.
    *   Verify error handling tests correctly simulate CoinGecko-relevant error responses and assert against `ApiError` types.
    *   Ensure all tests pass using the updated mocks and asserting CoinGecko-derived data.

4.  **Update Documentation (`README.md`)**:
    *   Locate line 160 (or the relevant line with the Mermaid diagram, `participant API as CoinDesk API`).
    *   Change `CoinDesk API` to `CoinGecko API`.
    *   Perform a full search within `README.md` for "CoinDesk", "coindesk.com", and any example CoinDesk API URLs or response snippets. Replace them with their CoinGecko equivalents.
    *   Ensure any textual descriptions of the data fetching mechanism accurately reflect CoinGecko.

5.  **Update Documentation (`MANIFEST_V3_APPROACHES.md`)**:
    *   Search for all instances of `api.coindesk.com` and replace with the appropriate CoinGecko URL or host permission string (`*://api.coingecko.com/*`).
    *   Review the document for textual references to "CoinDesk" and update to "CoinGecko" where appropriate, ensuring rationale and examples are consistent with CoinGecko usage.

6.  **Verification and Cleanup**:
    *   Run `pnpm test` (or equivalent) to execute all unit and integration tests. All tests must pass.
    *   Run `pnpm build && node verify-build.js` (or equivalent) to build the extension and run the verification script. The script must pass.
    *   To double-check `verify-build.js`, temporarily introduce an incorrect host permission in `src/manifest.json`, rebuild, and confirm `verify-build.js` fails as expected. Revert the temporary change.
    *   Perform a project-wide search for "CoinDesk", "coindesk.com", "bpi" (a common CoinDesk field) to catch any lingering references in comments, variable names, or other unlisted files.

## Testing Strategy

-   **Test Layers Affected:**
    -   **Unit Tests:** `src/service-worker/api.test.ts` is the primary focus. These tests will validate the `api.ts` module's ability to correctly fetch, parse CoinGecko responses, and handle its specific error conditions, using the updated `fetch` mock.
    -   **Integration Tests:** Any integration tests that depend on the global `fetch` mock (via `api.ts` or directly) will now interact with a CoinGecko-simulating mock. They should pass if their assertions are based on abstracted data (e.g., `PriceData`) rather than raw API response details.
    -   **E2E Tests:** Unlikely to be directly affected by mock changes as they should hit the real API. However, if any E2E test setup involves seeding mock data that was CoinDesk-formatted, it would need updating. The build verification fix is critical for E2E tests to run against a correctly permissioned manifest.

-   **What to Mock:**
    -   `fetch`: The global `fetch` function will continue to be mocked by `tests/mocks/fetch.ts`. This is a true external system boundary (the CoinGecko API).
    -   **Why:** To isolate `api.ts` from actual network dependencies, ensuring deterministic, fast, and repeatable tests. It allows simulation of various API responses (successes, different data values, error types, network failures) crucial for robust testing.
    -   **Adherence to Philosophy:** This aligns with "Mock ONLY True External System Boundaries" and "Testability Drives Design."

-   **Coverage Targets & Edge‑Case Notes:**
    -   Maintain or improve existing test coverage for `src/service-worker/api.ts`.
    -   Ensure `api.test.ts` thoroughly covers:
        -   Successful CoinGecko response parsing and correct data extraction (e.g., `response.bitcoin.usd`).
        -   Handling of various HTTP error codes from CoinGecko (400, 401, 403, 404, 429, 500, 503).
        -   Handling of malformed or unexpected JSON payloads from CoinGecko.
        -   Network errors (e.g., DNS failure, connection timeout) when attempting to call CoinGecko.
        -   Retry logic in `fetchBtcPrice` (if applicable) with CoinGecko-relevant retryable errors.

## Logging & Observability

-   **Test Failures:** Failures in `api.test.ts` will be reported by the test runner (e.g., Vitest, Jest) with stack traces and assertion diffs. Any `Logger` output from `api.ts` during test execution (e.g., for retries or debug information) will appear in the test console, aiding debugging.
-   **Build Script Failures:** `verify-build.js` will output clear error messages to `stderr` if its checks fail (e.g., "CRITICAL: Manifest host_permissions missing required entry: '*://api.coingecko.com/*'"). This output should be easily identifiable in CI logs.

## Security & Config

-   **Input Validation Hotspots:**
    -   The primary input validation relevant here is within `src/service-worker/api.ts` (e.g., `validateApiResponse` function or equivalent Zod schema) which parses and validates the structure of the JSON response from CoinGecko. This must correctly reflect the `CoinGeckoApiResponse` type.
-   **Secrets Handling:** No secrets are involved in interacting with the public CoinGecko API endpoint for price data.
-   **Least‑Privilege Notes:** The update to `verify-build.js` is crucial for enforcing least privilege. It ensures the build process validates that `manifest.json` only requests `host_permissions` for `*://api.coingecko.com/*` and not broader or outdated (CoinDesk) permissions.

## Documentation

-   **Code Self-Doc Patterns:**
    -   Ensure TSDoc comments in `tests/mocks/fetch.ts` and `src/service-worker/api.test.ts` are updated to reflect CoinGecko usage.
    -   Types like `CoinGeckoApiResponse` in `src/common/types.ts` serve as primary documentation for the data structure.
    -   Variable and function names should clearly indicate their purpose in the context of CoinGecko data.
-   **Readme / Other Updates:**
    -   `README.md`: Update line 160 (Mermaid diagram) and all other textual and graphical references from CoinDesk to CoinGecko.
    -   `MANIFEST_V3_APPROACHES.md`: Update all API endpoint examples, permission strings, and rationale from CoinDesk to CoinGecko.

## Risk Matrix

| Risk                                                                              | Severity | Mitigation                                                                                                                                                                                             |
| :-------------------------------------------------------------------------------- | :------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Incomplete update of mocks in `tests/mocks/fetch.ts` leading to false test sense. | CRITICAL | Rigorous review of mock implementation against CoinGecko's actual response structure. Ensure `api.test.ts` comprehensively tests various CoinGecko response scenarios using these mocks.               |
| `verify-build.js` logic for host permission check is incorrect or incomplete.     | CRITICAL | Manually test `verify-build.js` with both correct and incorrect `manifest.json` host permissions. Code review of the script's logic.                                                              |
| Missed instances of "CoinDesk" or its API structure in tests or documentation.    | High     | Perform thorough project-wide searches for "CoinDesk", "coindesk.com", "bpi". Mandatory PR review by a team member focused on these changes.                                                        |
| `CoinGeckoApiResponse` type in `src/common/types.ts` inaccurate.                  | Medium   | Cross-reference type with official CoinGecko documentation or sample live responses. Ensure `api.ts` parsing logic aligns with this type; tests should catch structural mismatches.                     |
| Test coverage gaps for new CoinGecko-specific error handling or data paths.       | Medium   | Review existing test coverage for `api.ts`. Add specific test cases for any CoinGecko behaviors or response nuances not covered by generic API error handling tests. Run tests with coverage reporting. |
| E2E tests break due to subtle manifest or environment changes not caught by script. | Medium   | Ensure E2E tests are run against a build verified by the updated `verify-build.js`. If E2E tests fail, investigate manifest/permission issues first.                                                |

## Open Questions

-   Are there any other files or scripts (e.g., specific E2E test setup scripts) that might hardcode CoinDesk URLs or response structures that were not listed in the initial context? (A project-wide search step is included as mitigation).
-   Confirm the exact structure of the `CoinGeckoApiResponse` expected by `src/service-worker/api.ts` (e.g., just `bitcoin.usd` or other fields/currencies). The plan assumes `{ bitcoin: { usd: number } }`.
