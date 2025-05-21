# Remediation Plan – Sprint <N>

## Executive Summary
This plan outlines the remediation strategy for critical and high-severity issues identified in the recent code review. The primary goals are to restore test suite integrity by eliminating global state pollution and fixing flawed test logic, enhance integration testing practices, and improve overall code quality. The strike order prioritizes unblocking foundational test fixes, followed by addressing architectural concerns and coding standards, ensuring a rapid return to a stable and maintainable codebase.

## Strike List
| Seq | CR‑ID | Title                                                                    | Effort | Owner?        |
|-----|-------|--------------------------------------------------------------------------|--------|---------------|
| 1   | cr‑02 | Eliminate Global State Pollution: `MutationObserver` Reassignment        | s      | Frontend Dev  |
| 2   | cr‑01 | Rectify Flawed Test Logic: `MutationObserver` `_callback` Access         | m      | Frontend Dev  |
| 3   | cr‑03 | Eradicate Global State Pollution: `Set.prototype.add` Modification       | xs     | Frontend Dev  |
| 4   | cr‑04 | Cease Over-Mocking Internal Collaborators in Integration Tests           | m      | Frontend Dev  |
| 5   | cr‑05 | Standardize Logger Mocking & Suppress Test Log Noise                     | xs     | Frontend Dev  |
| 6   | cr‑06 | Reduce Excessive `as any` / `as unknown as number` Type Casts            | s      | Frontend Dev  |
| 7   | cr‑07 | Prune Overly Verbose and Redundant Comments                              | s      | Frontend Dev  |

## Detailed Remedies

### cr‑02 Eliminate Global State Pollution: `MutationObserver` Reassignment
- **Problem:** Tests overwrite `global.MutationObserver`, polluting global state and leading to flaky, order-dependent tests.
- **Impact:** Reduced test reliability, difficult debugging, potential for concurrent test failures, and overall poor test hygiene, acting as a tech-debt anchor.
- **Chosen Fix:** Inject `MutationObserver` as a dependency.
    - Modify `createDomObserver` to accept an optional `mutationObserverConstructor: typeof MutationObserver = MutationObserver` parameter.
    - `createDomObserver` will use this parameter: `observer = new mutationObserverConstructor(handleMutationsCallback);`.
    - Tests will pass their `vi.fn()` mock for `MutationObserver` via this new parameter.
    - All assignments to `global.MutationObserver` will be removed.
- **Steps:**
  1. Modify the `createDomObserver` function signature in `src/content-script/dom-observer.ts` to accept `mutationObserverConstructor` as an optional parameter, defaulting to the global `MutationObserver`.
  2. Update the instantiation of `MutationObserver` within `createDomObserver` to use `mutationObserverConstructor`.
  3. Refactor `beforeEach`/`afterEach` blocks in `src/content-script/dom-observer.test.ts`, `tests/integration/content-script-initialization.test.ts`, and `tests/integration/dom-observer-annotation.test.ts` to remove assignments to `global.MutationObserver`.
  4. In these test files, when `createDomObserver` is called (or its mock setup), provide a mock `MutationObserver` constructor via the new parameter.
- **Done‑When:** All tests pass without any assignments to `global.MutationObserver`. Test runs are consistently reliable regardless of order or concurrency. `createDomObserver` uses the injected constructor.

### cr‑01 Rectify Flawed Test Logic: `MutationObserver` `_callback` Access
- **Problem:** Tests incorrectly access a non-standard internal `_callback` property on a *new, unrelated* `MutationObserver` instance created within the test, not the SUT's observer.
- **Impact:** Tests are brittle, likely test nothing relevant or pass coincidentally, and can break with JSDOM updates, leading to false confidence and potential regressions (logic bomb).
- **Chosen Fix:** Capture the SUT's actual callback from the (mocked) `MutationObserver` constructor. (Depends on `cr-02` completion for clean injection).
    - The mock `mutationObserverConstructor` (passed via DI as per `cr-02`) will capture the callback argument passed to it by the SUT.
    - This captured callback is the SUT's actual `handleMutationsCallback` bound to the `DomObserverController`.
    - Invoke this captured callback directly in tests to simulate mutation events.
- **Steps:**
  1. Ensure `cr-02` is completed.
  2. In `src/content-script/dom-observer.test.ts`, when providing the mock `mutationObserverConstructor` to `createDomObserver`, ensure its implementation captures the `callback` argument (e.g., `let capturedCallback; const mockConstructor = vi.fn(cb => { capturedCallback = cb; return mockObserverInstance; });`).
  3. Identify all test instances (e.g., L298, L358, L427, L511, L616, L1012) that use `(new MutationObserver(...))._callback`.
  4. Refactor these tests to invoke the `capturedCallback` with mock `MutationRecord[]` to simulate mutations.
  5. Remove all direct access to the `_callback` property.
- **Done‑When:** All relevant tests in `dom-observer.test.ts` correctly capture and invoke the SUT's `handleMutationsCallback`. Tests accurately reflect SUT behavior concerning mutation handling.

### cr‑03 Eradicate Global State Pollution: `Set.prototype.add` Modification
- **Problem:** A test modifies `Set.prototype.add` globally to simulate an error condition, a severe anti-pattern.
- **Impact:** Pollutes the global `Set` prototype, risking unpredictable behavior and hard-to-debug failures in other tests, the test runner, or any code using Sets (logic bomb).
- **Chosen Fix:** Remove global prototype pollution. Attempt to trigger the error through valid inputs or re-evaluate test necessity.
    - Primary goal: remove the `Set.prototype.add` modification.
    - Attempt to trigger the `try/catch` in `scheduleProcessing` by making `newNodes.forEach()` throw (e.g., by passing malformed `newNodes` if this is a realistic scenario the `catch` is intended for).
    - If this isn't feasible or valuable, remove the specific test case for `Set.add` failure.
- **Steps:**
  1. In `src/content-script/dom-observer.test.ts:749-752`, remove the lines that modify and restore `Set.prototype.add`.
  2. Analyze the `try/catch` block in `scheduleProcessing`. Attempt to construct a test case where `newNodes` is malformed in a way that `newNodes.forEach(...)` itself throws an error, thus testing the `catch` block.
  3. If step 2 is not feasible or doesn't align with the intended purpose of the `catch` block for `pendingNodes.add` errors, critically evaluate if testing this specific internal `Set.add` failure is essential.
  4. If deemed non-essential or too difficult to test safely, remove this specific test scenario.
- **Done‑When:** The modification to `Set.prototype.add` is removed. The test either verifies the `try/catch` block via a safer method or is removed/simplified if its value is low.

### cr‑04 Cease Over-Mocking Internal Collaborators in Integration Tests
- **Problem:** Integration tests mock internal modules like `findAndAnnotatePrices` or `createDomObserver`, leading to tests that primarily verify wiring rather than integrated behavior.
- **Impact:** Tests become brittle (break with internal structure changes even if behavior is correct) and can mask real integration bugs between these internal parts (tech-debt anchor).
- **Chosen Fix:** Refactor integration tests to use real implementations for internal modules.
    - For `content-script-initialization.test.ts`, allow the real `findAndAnnotatePrices` and `createDomObserver` to run. Assert the *effects*.
    - For logger mocking (e.g., in `dom-observer-annotation.test.ts`), if not asserting specific log messages, consider not mocking it or using a no-op logger.
- **Steps:**
  1. In `tests/integration/content-script-initialization.test.ts`, remove `vi.mock` calls for `../../src/content-script/price-annotation/findAndAnnotatePrices` and `../../src/content-script/dom-observer`.
  2. Ensure tests import and use the actual implementations.
  3. Adjust assertions to verify the observable effects of these functions (e.g., DOM modifications by `findAndAnnotatePrices`, or that `createDomObserver` results in an observer that can be started and reacts to DOM changes).
  4. In `tests/integration/dom-observer-annotation.test.ts`, review logger mocking. If specific log messages are not being asserted, consider removing the mock to test with the real (or globally mocked for tests) logger, or use a minimal no-op logger.
- **Done‑When:** Integration tests utilize real internal modules. Assertions verify integrated behavior and outcomes, not just mock interactions. Tests are less brittle to internal refactoring if the overall behavior remains correct.

### cr‑05 Standardize Logger Mocking & Suppress Test Log Noise
- **Problem:** `dom-observer.test.ts` instantiates a real logger, causing potential console noise and inconsistency with other tests that mock the logger factory.
- **Impact:** Test output can be cluttered, obscuring actual test failures and making debugging harder. Inconsistent test setup.
- **Chosen Fix:** Standardize on mocking the logger factory in `dom-observer.test.ts`.
- **Steps:**
  1. In `src/content-script/dom-observer.test.ts`, add `vi.mock('../../src/shared/logger', () => ({ createLogger: () => ({ info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() }) }));` at the top of the file.
  2. Remove the local instantiation: `const logger = createLogger(...)`.
  3. Ensure any existing tests that might have implicitly relied on real logger output are still valid or adjusted.
- **Done‑When:** `dom-observer.test.ts` runs without producing unintended log output to the console. Logger behavior can be asserted via mock functions if needed.

### cr‑06 Reduce Excessive `as any` / `as unknown as number` Type Casts
- **Problem:** Numerous `as any` casts for `MutationRecord` mock inputs and `as unknown as number` for `window.setTimeout` bypass TypeScript's type safety.
- **Impact:** Hides potential type errors, makes tests harder to understand/maintain, and may mask TypeScript configuration issues.
- **Chosen Fix:** Create a well-typed helper for `MutationRecord` mocks and verify/correct TypeScript configuration for DOM types.
- **Steps:**
  1. In `src/content-script/dom-observer.test.ts`, define and use a helper function: `const createMockMutationRecord = (options: Partial<MutationRecord>): MutationRecord => ({ type: 'childList', addedNodes: [] as any, removedNodes: [] as any, ...options } as MutationRecord);`. Ensure `addedNodes` and `removedNodes` are correctly typed (e.g. `Node[]` which can be cast to `NodeListOf<Node>`).
  2. Replace `as any` casts for `MutationRecord` mocks with this helper function.
  3. In `src/content-script/dom-observer.ts:213`, verify `tsconfig.json` includes `"DOM"` in the `"lib"` array.
  4. If DOM lib is present, change `window.setTimeout(...) as unknown as number` to `window.setTimeout(...) as number` or preferably type the `timeoutId` variable as `ReturnType<typeof setTimeout>`. If DOM lib is missing, add it.
- **Done‑When:** `as any` casts for `MutationRecord` are eliminated. The `setTimeout` cast is removed or made type-safe. TypeScript provides stronger guarantees.

### cr‑07 Prune Overly Verbose and Redundant Comments
- **Problem:** Excessive "what/how" comments in `src/content-script/dom-observer.ts` and `src/common/constants.ts` add noise and maintenance burden.
- **Impact:** Obscures more important comments, makes code harder to read, and comments can become outdated.
- **Chosen Fix:** Remove comments that merely restate obvious code logic. Retain comments explaining non-obvious decisions, complex logic, or rationale.
- **Steps:**
  1. Review `src/content-script/dom-observer.ts` and `src/common/constants.ts`.
  2. Delete comments that explain *what* the code is doing if the code itself is clear (e.g., `// Loop through nodes`, `// Increment counter`).
  3. Keep comments that explain *why* something is done a particular way, or clarify complex algorithms or business logic (e.g., "T009" references).
  4. For TSDoc, ensure it's focused on exported APIs and genuinely complex internal functions/types. Remove TSDoc from trivial internal helpers if their name and signature are self-documenting.
- **Done‑When:** Code is cleaner and easier to read. Comments primarily provide rationale for non-obvious code, reducing maintenance overhead.

## Standards Alignment
This remediation plan directly supports our core development philosophies:
- **Design for Testability:** `cr-01`, `cr-02`, `cr-03`, `cr-04`, `cr-05` all significantly improve test isolation, reliability, and focus on behavior over implementation details.
- **Modularity (No Global State Pollution):** `cr-02` and `cr-03` eliminate global state modifications, enforcing stronger module boundaries and preventing unintended side effects.
- **Simplicity First:** Removing flawed/brittle test logic (`cr-01`), global hacks (`cr-03`), over-mocking (`cr-04`), and verbose comments (`cr-07`) all contribute to a simpler, more understandable codebase.
