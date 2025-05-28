# Todo

## `MutationObserver` Global State & Test Logic (CR-02, CR-01)
- [x] **T001 · Refactor · P0: inject `MutationObserver` constructor dependency into `createDomObserver`**
    - **Context:** PLAN.md · cr-02 · Steps 1-2
    - **Action:**
        1. Modify `createDomObserver` function signature in `src/content-script/dom-observer.ts` to accept an optional `mutationObserverConstructor: typeof MutationObserver = MutationObserver` parameter.
        2. Update the instantiation of `MutationObserver` within `createDomObserver` to use the provided `mutationObserverConstructor`.
    - **Done‑when:**
        1. `createDomObserver` uses the injected constructor.
        2. Code compiles and existing tests (if any run against this partial change) pass.
    - **Verification:**
        1. Review `src/content-script/dom-observer.ts` to confirm change.
        2. Run `npm run build` (or equivalent type-checking command).
    - **Depends‑on:** none

- [~] **T002 · Test · P0: remove `global.MutationObserver` assignments from `dom-observer.test.ts`**
    - **Context:** PLAN.md · cr-02 · Steps 3-4
    - **Action:**
        1. In `src/content-script/dom-observer.test.ts`, refactor `beforeEach`/`afterEach` blocks to remove assignments to `global.MutationObserver`.
        2. When `createDomObserver` is called (or its mock setup), provide a mock `MutationObserver` constructor via the new parameter.
    - **Done‑when:**
        1. All tests in `dom-observer.test.ts` pass without any assignments to `global.MutationObserver`.
        2. Test runs are consistently reliable regardless of order or concurrency.
    - **Verification:**
        1. Run `dom-observer.test.ts` multiple times, potentially in random order, to check for flakiness.
    - **Depends‑on:** [T001]

- [x] **T003 · Test · P0: remove `global.MutationObserver` assignments from `content-script-initialization.test.ts`**
    - **Context:** PLAN.md · cr-02 · Steps 3-4
    - **Action:**
        1. In `tests/integration/content-script-initialization.test.ts`, refactor `beforeEach`/`afterEach` blocks to remove assignments to `global.MutationObserver`.
        2. When `createDomObserver` is called (or its mock setup), provide a mock `MutationObserver` constructor via the new parameter.
    - **Done‑when:**
        1. All tests in `content-script-initialization.test.ts` pass without any assignments to `global.MutationObserver`.
    - **Verification:**
        1. Run `content-script-initialization.test.ts` to confirm tests pass.
    - **Depends‑on:** [T001]

- [x] **T004 · Test · P0: remove `global.MutationObserver` assignments from `dom-observer-annotation.test.ts`**
    - **Context:** PLAN.md · cr-02 · Steps 3-4
    - **Action:**
        1. In `tests/integration/dom-observer-annotation.test.ts`, refactor `beforeEach`/`afterEach` blocks to remove assignments to `global.MutationObserver`.
        2. When `createDomObserver` is called (or its mock setup), provide a mock `MutationObserver` constructor via the new parameter.
    - **Done‑when:**
        1. All tests in `dom-observer-annotation.test.ts` pass without any assignments to `global.MutationObserver`.
    - **Verification:**
        1. Run `dom-observer-annotation.test.ts` to confirm tests pass.
    - **Depends‑on:** [T001]

- [ ] **T005 · Test · P1: capture SUT's `handleMutationsCallback` in `dom-observer.test.ts` mock constructor**
    - **Context:** PLAN.md · cr-01 · Step 2
    - **Action:**
        1. In `src/content-script/dom-observer.test.ts`, when providing the mock `mutationObserverConstructor` to `createDomObserver` (as per T002), ensure its implementation captures the `callback` argument passed to it by the SUT.
    - **Done‑when:**
        1. The mock `mutationObserverConstructor` correctly captures the SUT's callback.
    - **Verification:**
        1. Add a temporary assertion or debugger statement to confirm callback capture during a test run.
    - **Depends‑on:** [T002]

- [ ] **T006 · Test · P1: refactor `dom-observer.test.ts` to use captured callback and remove `_callback` access**
    - **Context:** PLAN.md · cr-01 · Steps 3-5
    - **Action:**
        1. Identify all test instances (e.g., L298, L358, L427, L511, L616, L1012 in `dom-observer.test.ts`) that use `(new MutationObserver(...))._callback`.
        2. Refactor these tests to invoke the `capturedCallback` (from T005) with mock `MutationRecord[]` to simulate mutations.
        3. Remove all direct access to the `_callback` property.
    - **Done‑when:**
        1. All relevant tests in `dom-observer.test.ts` correctly invoke the SUT's `handleMutationsCallback` via the captured function.
        2. No direct access to `_callback` property remains.
        3. Tests accurately reflect SUT behavior concerning mutation handling.
    - **Verification:**
        1. Run `dom-observer.test.ts` and confirm all tests pass.
        2. Code search confirms no `._callback` access remains.
    - **Depends‑on:** [T005]

## `Set.prototype` Global State (CR-03)
- [x] **T007 · Refactor · P1: remove `Set.prototype.add` modification from `dom-observer.test.ts`**
    - **Context:** PLAN.md · cr-03 · Step 1
    - **Action:**
        1. In `src/content-script/dom-observer.test.ts:749-752`, remove the lines that modify and restore `Set.prototype.add`.
    - **Done‑when:**
        1. The modification to `Set.prototype.add` is removed.
    - **Verification:**
        1. Run `dom-observer.test.ts` and confirm the specific test related to this (if it still exists and runs) passes or fails as expected without the prototype pollution.
    - **Depends‑on:** none

- [x] **T008 · Test · P2: evaluate and refactor/remove `Set.add` failure test in `dom-observer.test.ts`**
    - **Context:** PLAN.md · cr-03 · Steps 2-4
    - **Action:**
        1. Analyze the `try/catch` block in `scheduleProcessing` (in `src/content-script/dom-observer.ts`).
        2. Attempt to construct a test case where `newNodes.forEach(...)` itself throws an error (e.g., by passing malformed `newNodes` if realistic), thus testing the `catch` block safely.
        3. If step 2 is not feasible or doesn't align with the intended purpose of the `catch` block for `pendingNodes.add` errors, critically evaluate if testing this specific internal `Set.add` failure is essential and remove/simplify the test scenario if not.
    - **Done‑when:**
        1. The test either verifies the `try/catch` block via a safer method or is removed/simplified if its value is low.
        2. `dom-observer.test.ts` passes.
    - **Verification:**
        1. Review test coverage for the `scheduleProcessing` `try/catch` block.
    - **Depends‑on:** [T007]

## Integration Testing Practices (CR-04)
- [x] **T009 · Test · P1: remove internal module mocks in `content-script-initialization.test.ts`**
    - **Context:** PLAN.md · cr-04 · Steps 1-3
    - **Action:**
        1. In `tests/integration/content-script-initialization.test.ts`, remove `vi.mock` calls for `../../src/content-script/price-annotation/findAndAnnotatePrices` and `../../src/content-script/dom-observer`.
        2. Ensure tests import and use the actual implementations.
        3. Adjust assertions to verify the observable effects (e.g., DOM modifications, observer activity).
    - **Done‑when:**
        1. `content-script-initialization.test.ts` utilizes real internal modules.
        2. Assertions verify integrated behavior and outcomes, not just mock interactions.
        3. Tests are less brittle to internal refactoring if the overall behavior remains correct.
    - **Verification:**
        1. Run `content-script-initialization.test.ts` and confirm tests pass by observing actual integrated effects.
    - **Depends‑on:** none  (While T003 makes `createDomObserver` injectable, this task is about *not* mocking it at the integration level)

- [x] **T010 · Test · P2: review logger mocking in `dom-observer-annotation.test.ts`**
    - **Context:** PLAN.md · cr-04 · Step 4
    - **Action:**
        1. In `tests/integration/dom-observer-annotation.test.ts`, review logger mocking.
        2. If specific log messages are not being asserted, consider removing the mock to test with the real (or globally mocked for tests) logger, or use a minimal no-op logger.
    - **Done‑when:**
        1. Logger mocking in `dom-observer-annotation.test.ts` is appropriate for its testing goals.
    - **Verification:**
        1. Run `dom-observer-annotation.test.ts` and confirm tests pass and log output (if any) is as expected.
    - **Depends‑on:** none

## Test Logging (CR-05)
- [x] **T011 · Test · P2: standardize logger mocking in `dom-observer.test.ts`**
    - **Context:** PLAN.md · cr-05 · Steps 1-3
    - **Action:**
        1. In `src/content-script/dom-observer.test.ts`, add `vi.mock('../../src/shared/logger', () => ({ createLogger: () => ({ info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() }) }));` at the top of the file.
        2. Remove the local instantiation: `const logger = createLogger(...)`.
        3. Ensure any existing tests that might have implicitly relied on real logger output are still valid or adjusted.
    - **Done‑when:**
        1. `dom-observer.test.ts` runs without producing unintended log output to the console.
        2. Logger behavior can be asserted via mock functions if needed.
    - **Verification:**
        1. Run `dom-observer.test.ts` and observe console output for absence of unintended logs.
    - **Depends‑on:** none

## Type Safety (CR-06)
- [x] **T012 · Refactor · P2: create and use typed helper for `MutationRecord` mocks in `dom-observer.test.ts`**
    - **Context:** PLAN.md · cr-06 · Steps 1-2
    - **Action:**
        1. In `src/content-script/dom-observer.test.ts`, define and use a helper function: `const createMockMutationRecord = (options: Partial<MutationRecord>): MutationRecord => ({ type: 'childList', addedNodes: [] as Node[], removedNodes: [] as Node[], ...options } as MutationRecord);`. (Ensure `Node[]` is castable to `NodeListOf<Node>` if JSDOM/TS requires it for the mock).
        2. Replace `as any` casts for `MutationRecord` mocks with this helper function.
    - **Done‑when:**
        1. `as any` casts for `MutationRecord` are eliminated in `dom-observer.test.ts`.
        2. TypeScript provides stronger guarantees for these mocks.
    - **Verification:**
        1. Run `npm run typecheck` (or equivalent) and confirm no type errors.
        2. Review code to ensure helper usage.
    - **Depends‑on:** none

- [x] **T013 · Refactor · P2: verify `tsconfig.json` DOM lib and fix `setTimeout` type cast**
    - **Context:** PLAN.md · cr-06 · Steps 3-4
    - **Action:**
        1. In `src/content-script/dom-observer.ts:213`, verify `tsconfig.json` includes `"DOM"` in the `"lib"` array. If missing, add it.
        2. Change `window.setTimeout(...) as unknown as number` to `window.setTimeout(...) as number` or preferably type the `timeoutId` variable as `ReturnType<typeof setTimeout>`.
    - **Done‑when:**
        1. The `setTimeout` cast is removed or made type-safe.
        2. TypeScript configuration for DOM types is correct.
    - **Verification:**
        1. Run `npm run typecheck` (or equivalent) and confirm no type errors related to `setTimeout` or DOM types.
    - **Depends‑on:** none

## Code Readability (CR-07)
- [x] **T014 · Chore · P2: prune verbose/redundant comments in `src/content-script/dom-observer.ts`**
    - **Context:** PLAN.md · cr-07 · Steps 1-4
    - **Action:**
        1. Review `src/content-script/dom-observer.ts`. Delete comments that explain *what* the code is doing if the code itself is clear.
        2. Keep comments that explain *why* something is done, clarify complex logic, or TSDoc for exported APIs/complex functions.
    - **Done‑when:**
        1. Code in `src/content-script/dom-observer.ts` is cleaner and easier to read.
        2. Comments primarily provide rationale for non-obvious code.
    - **Verification:**
        1. Code review confirms improved readability and appropriate commenting.
    - **Depends‑on:** none

- [ ] **T015 · Chore · P2: prune verbose/redundant comments in `src/common/constants.ts`**
    - **Context:** PLAN.md · cr-07 · Steps 1-4
    - **Action:**
        1. Review `src/common/constants.ts`. Delete comments that explain *what* the code is doing if the code itself is clear.
        2. Keep comments that explain *why* something is done, or TSDoc for exported APIs/complex types.
    - **Done‑when:**
        1. Code in `src/common/constants.ts` is cleaner and easier to read.
    - **Verification:**
        1. Code review confirms improved readability and appropriate commenting.
    - **Depends‑on:** none

---

### Clarifications & Assumptions
- [ ] **Issue:** Confirm accuracy of file paths and line numbers referenced from PLAN.md.
    - **Context:** All tasks referencing specific file locations.
    - **Blocking?:** no (Developer to verify during implementation)

- [ ] **Issue:** Determine if the `catch` block in `scheduleProcessing` (cr-03) is intended to catch errors from `pendingNodes.add` specifically, or more general errors within the `try`.
    - **Context:** PLAN.md · cr-03 (Affects T008 strategy)
    - **Blocking?:** no (T008 includes evaluation)