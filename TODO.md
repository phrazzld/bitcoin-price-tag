# Todo

## Clarifications & Assumptions
- [x] **CL001 · Clarification · P0: Confirm exact CoinGeckoApiResponse structure for bitcoin price**
    - **Context:** PLAN.md > Open Questions ("Confirm the exact structure of the `CoinGeckoApiResponse` expected by `src/service-worker/api.ts`...")
    - **Blocking?:** yes (for T001)

- [ ] **CL002 · Clarification · P2: Identify any other files or scripts (e.g., E2E test setup) hardcoding CoinDesk URLs/structures**
    - **Context:** PLAN.md > Open Questions ("Are there any other files or scripts... that might hardcode CoinDesk URLs...")
    - **Blocking?:** no (T008 includes a project-wide search as mitigation)

## Core Type Definition
- [x] **T001 · Refactor · P0: Define/Update `CoinGeckoApiResponse` type in `src/common/types.ts`**
    - **Context:** PLAN.md > Architecture Blueprint > Public Interfaces / Contracts (`CoinGeckoApiResponse`); Risk Matrix (`CoinGeckoApiResponse` type in `src/common/types.ts` inaccurate.)
    - **Action:**
        1. Based on `CL001`'s findings, define or update the `CoinGeckoApiResponse` interface in `src/common/types.ts`.
        2. Ensure the type accurately reflects the confirmed JSON structure for Bitcoin price in USD (e.g., `{ bitcoin: { usd: number } }`).
    - **Done‑when:**
        1. `CoinGeckoApiResponse` type is correctly defined/updated in `src/common/types.ts`.
        2. The type definition matches the confirmed structure from `CL001`.
    - **Depends‑on:** CL001

## Build Script
- [x] **T002 · Bugfix · P0: Update `verify-build.js` to check for CoinGecko host permission**
    - **Context:** PLAN.md > Detailed Build Steps > 1. Correct Manifest Host Permissions Check in Build Script (`verify-build.js`)
    - **Action:**
        1. In `verify-build.js` (around line 69), change expected host permission from `*://api.coindesk.com/*` to `*://api.coingecko.com/*`.
        2. Update error messages in the script to reference `*://api.coingecko.com/*`.
        3. Confirm script correctly reads `host_permissions` from `dist/manifest.json`.
    - **Done‑when:**
        1. `verify-build.js` exits 0 if `dist/manifest.json` has `*://api.coingecko.com/*`.
        2. `verify-build.js` exits non-zero with a clear error if permission is missing/incorrect.
    - **Verification:**
        1. Run `pnpm build && node verify-build.js` with a correct `src/manifest.json`; script must pass.
        2. Temporarily alter `src/manifest.json` to an incorrect permission, rebuild, run script; confirm failure and correct error message. Revert change.
    - **Depends‑on:** none

## Test Mocks
- [x] **T003 · Refactor · P0: Update `tests/mocks/fetch.ts` to simulate CoinGecko API**
    - **Context:** PLAN.md > Detailed Build Steps > 2. Update Mock Fetch Implementation (`tests/mocks/fetch.ts`)
    - **Action:**
        1. Replace `CoinDeskApiResponse` type usage with `CoinGeckoApiResponse` (imported from `src/common/types.ts`).
        2. Update mock fetch helpers (`createFetchMock`, `mockFetchPrice`, `mockFetchError`) to generate `CoinGeckoApiResponse` success data and simulate CoinGecko-specific HTTP errors (e.g., 400, 403, 404, 429, 500) and network failures.
        3. Remove all CoinDesk-specific mock data and logic; update TSDoc comments to reflect CoinGecko.
    - **Done‑when:**
        1. `tests/mocks/fetch.ts` uses `CoinGeckoApiResponse`.
        2. Mock functions accurately simulate CoinGecko success and specified error responses.
        3. No CoinDesk-specific code remains in the mock file and TSDoc comments are updated.
    - **Depends‑on:** T001

## API Unit Tests
- [x] **T004 · Test · P0: Align `src/service-worker/api.test.ts` with CoinGecko API and mocks**
    - **Context:** PLAN.md > Detailed Build Steps > 3. Update API Unit Tests (`src/service-worker/api.test.ts`)
    - **Action:**
        1. Ensure API URL in tests uses the production constant from `src/service-worker/api.ts` for the CoinGecko endpoint.
        2. Replace CoinDesk-related test data and assertions with `CoinGeckoApiResponse` structure (e.g., extracting price from `data.bitcoin.usd`).
        3. Update tests for `validateApiResponse` (if applicable) and error handling to use CoinGecko formats and mock behaviors; update TSDoc comments.
    - **Done‑when:**
        1. All tests in `src/service-worker/api.test.ts` pass using CoinGecko data structures and updated mocks.
        2. Tests correctly assert against `PriceData` derived from CoinGecko responses and `ApiError` for CoinGecko errors.
        3. TSDoc comments within the test file are updated.
    - **Depends‑on:** T001, T003

- [ ] **T005 · Test · P1: Enhance `api.test.ts` coverage for CoinGecko specific scenarios**
    - **Context:** PLAN.md > Testing Strategy > Coverage Targets & Edge‑Case Notes; Risk Matrix (Test coverage gaps for new CoinGecko-specific error handling or data paths.)
    - **Action:**
        1. Review `api.test.ts`; add/update tests for successful CoinGecko response parsing (e.g., `response.bitcoin.usd`).
        2. Add/update tests for various HTTP error codes from CoinGecko (400, 401, 403, 404, 429, 500, 503), malformed/unexpected JSON payloads, and network errors.
        3. Verify retry logic tests (if applicable in `api.ts`) use CoinGecko-relevant retryable errors.
    - **Done‑when:**
        1. `api.test.ts` thoroughly covers specified CoinGecko success and error scenarios.
        2. Test coverage for `src/service-worker/api.ts` is maintained or improved for CoinGecko interactions.
    - **Depends‑on:** T004

## Documentation
- [x] **T006 · Chore · P1: Update `README.md` to reflect CoinGecko API usage**
    - **Context:** PLAN.md > Detailed Build Steps > 4. Update Documentation (`README.md`)
    - **Action:**
        1. Change `CoinDesk API` to `CoinGecko API` in Mermaid diagram (line 160 or relevant).
        2. Search and replace all "CoinDesk", "coindesk.com", and CoinDesk API URLs/response snippets with CoinGecko equivalents.
        3. Ensure textual descriptions of data fetching accurately reflect CoinGecko.
    - **Done‑when:**
        1. `README.md` accurately reflects CoinGecko as the API provider.
        2. All identified CoinDesk references (textual, diagrammatic, examples) are replaced with CoinGecko equivalents.
    - **Verification:**
        1. Manually review the rendered `README.md` for correctness and completeness of changes.
    - **Depends‑on:** none

- [x] **T007 · Chore · P1: Update `MANIFEST_V3_APPROACHES.md` to reflect CoinGecko API usage**
    - **Context:** PLAN.md > Detailed Build Steps > 5. Update Documentation (`MANIFEST_V3_APPROACHES.md`)
    - **Action:**
        1. Replace all `api.coindesk.com` instances with the appropriate CoinGecko URL or host permission string (`*://api.coingecko.com/*`).
        2. Update textual "CoinDesk" references to "CoinGecko" and ensure rationale/examples are consistent with CoinGecko.
    - **Done‑when:**
        1. `MANIFEST_V3_APPROACHES.md` accurately reflects CoinGecko API dependencies and permissions.
        2. All CoinDesk references are replaced, and rationale is consistent with CoinGecko.
    - **Verification:**
        1. Manually review `MANIFEST_V3_APPROACHES.md` for correctness and completeness of changes.
    - **Depends‑on:** none

## Verification & Cleanup
- [x] **T008 · Chore · P1: Perform project-wide search and cleanup of residual CoinDesk references**
    - **Context:** PLAN.md > Detailed Build Steps > 6 (Verification and Cleanup - Perform a project-wide search...); Risk Matrix (Missed instances of "CoinDesk"...); Open Questions (Are there any other files or scripts...)
    - **Action:**
        1. Conduct a project-wide search for "CoinDesk", "coindesk.com", and "bpi".
        2. Review and update/remove any lingering references found in comments, variable names, or other unlisted files.
    - **Done‑when:**
        1. Project-wide search confirms no unintended CoinDesk or "bpi" references remain.
        2. All necessary updates based on search results are committed.
    - **Verification:**
        1. Perform a final project-wide search for the specified terms to confirm zero relevant hits.
    - **Depends‑on:** T006, T007

- [ ] **T009 · Test · P0: Execute full test suite and build verification script**
    - **Context:** PLAN.md > Detailed Build Steps > 6 (Verification and Cleanup - Run `pnpm test`, Run `pnpm build && node verify-build.js`)
    - **Action:**
        1. Run `pnpm test` (or equivalent) to execute all unit and integration tests.
        2. Run `pnpm build && node verify-build.js` (or equivalent) to build the extension and run the verification script.
    - **Done‑when:**
        1. All tests pass successfully.
        2. The build completes successfully and `verify-build.js` script passes (exits with status 0).
    - **Verification:**
        1. Observe test runner output for 100% pass rate.
        2. Observe `verify-build.js` exit code 0 and success message in CI logs or local console.
    - **Depends‑on:** T002, T005, T008