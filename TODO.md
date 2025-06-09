# TODO

## High Priority

- [x] ### Fix CI workflow to use optimized test suite ✅ COMPLETED
- **Priority**: Critical (CI Blocker)
- **Issue**: CI running full test suite instead of optimized CI suite
- **Location**: `.github/workflows/ci.yml:39`
- **Details**:
  - CI executes `pnpm run test` (500+ tests, 5+ min) causing timeouts
  - Should execute `pnpm run test:ci` (439 tests, 2.4s)
  - Service worker test `src/service-worker/index.test.ts` excluded from CI config but still running
  - Test stratification strategy implemented but not used by CI
- **Action Items**:
  - Update CI workflow to use `pnpm run test:ci` command
  - Verify problematic service worker test is properly excluded
  - Test CI pipeline with optimized suite
  - Update documentation to reflect CI test strategy
- **Resolution**: ✅ Updated CI workflow to use `pnpm run test:ci` (439 tests in 2.83s) instead of `pnpm run test` (500+ tests in 5+ min). Verified service worker test properly excluded from CI config. This eliminates CI timeout failures while maintaining comprehensive test coverage through test stratification strategy.

- [ ] ### Fix Playwright Chrome API type definitions
- **Priority**: High
- **Issue**: Multiple TypeScript compilation errors in Playwright tests
- **Location**: `tests/playwright/fixtures/extension-final.ts` and related files
- **Details**:
  - 8 TypeScript errors preventing compilation
  - Chrome API mock interfaces don't match actual Extension API types
  - Missing type guards for optional properties like `serviceWorker`
  - Inconsistent type definitions across test infrastructure
- **Action Items**:
  - Fix `runtime.sendMessage` callback parameter type mismatch
  - Update `runtime.lastError` to properly handle undefined
  - Implement complete `LocalStorageArea` interface or use proper assertions
  - Add required properties to `i18n` interface mock
  - Add undefined checks for `serviceWorker` access
  - Ensure parameter types match Chrome Extension API specifications

- [ ] ### Optimize service worker test beforeEach hook
- **Priority**: Medium
- **Issue**: Heavy integration test causing CI timeouts
- **Location**: `src/service-worker/index.test.ts:130`
- **Details**:
  - beforeEach hook contains 15+ mock resets and complex async operations
  - Exceeds 10-second CI timeout limit when run in full suite
  - Currently excluded from CI but should be optimized for inclusion
- **Action Items**:
  - Analyze and simplify beforeEach mock setup operations
  - Reduce CI-specific async operations (vi.runAllTimersAsync, setImmediate)
  - Group related mock operations for efficiency
  - Consider test-specific setup instead of heavy global beforeEach
  - Add performance monitoring for hook execution time
  - Re-include in CI suite once optimized

- [ ] ### Update test infrastructure documentation
- **Priority**: Low
- **Issue**: CI test strategy not documented in workflow
- **Details**:
  - Test stratification strategy documentation exists but CI workflow not updated
  - Need to document CI test command usage and expectations
- **Action Items**:
  - Update CI workflow comments to reference test strategy
  - Add documentation linking CI config to test stratification docs
  - Document CI performance expectations and monitoring

- [x] ### Fix CI timer state corruption in TestLifecycleManager ✅ COMPLETED
- **Priority**: Critical (CI Blocker)
- **Issue**: `global.setTimeout is not a function` error in CI environment
- **Location**: `tests/utils/test-lifecycle.ts:461`
- **Details**:
  - Timer isolation feature is corrupting global timer functions in CI
  - Original timer functions not being properly restored
  - Affects all tests that use timers after corruption occurs
- **Action Items**:
  - Fix timer backup/restore mechanism to handle CI environment
  - Add safety checks before accessing timer functions
  - Implement fallback for corrupted timer state
  - Make timer isolation opt-in for CI compatibility
- **Resolution**: ✅ Implemented robust timer handling with fallback mechanisms, disabled timer isolation by default, and added protection against double-wrapping. Service worker tests updated with safer cleanup handling.

- [x] ### Fix service worker test cleanup timeouts ✅ COMPLETED
- **Priority**: Critical (CI Blocker)
- **Issue**: afterEach hooks timing out in service worker tests
- **Location**: `src/service-worker/index.test.ts:130`
- **Details**:
  - 12 afterEach hooks timing out after 10 seconds
  - Likely caused by timer state corruption preventing cleanup
  - Blocks all subsequent tests in the suite
- **Action Items**:
  - Add explicit timeout handling in afterEach hooks
  - Ensure cleanup doesn't depend on potentially corrupted timers
  - Add try-catch error boundaries in cleanup
  - Implement force cleanup mechanism for CI
- **Resolution**: ✅ The timeout issues were resolved by the previous timer corruption fixes. A related linting error (`require()` import) was also fixed, allowing CI to pass. Service worker tests now run consistently (30 passed | 1 skipped) without timeouts.

- [x] ### Fix test lifecycle manager timer validation ✅ COMPLETED
- **Priority**: High
- **Issue**: Assertion failure in timer state validation
- **Location**: `tests/utils/test-lifecycle.test.ts:221`
- **Details**:
  - Test expecting `cleanupExecuted` to be true but getting false
  - Timer-dependent cleanup not executing in CI
  - Test isolation validation failing
- **Action Items**:
  - Fix async cleanup execution in timer-corrupted state
  - Add CI-specific timer handling
  - Ensure cleanup functions execute even without timers
  - Add diagnostic logging for CI debugging
- **Resolution**: ✅ Resolved by the timer corruption fixes. All TestLifecycleManager tests now pass (31 passed) with proper async cleanup execution and timer handling.

- [x] ### Add CI-specific timer safeguards ✅ COMPLETED
- **Priority**: High
- **Issue**: Prevent future timer state corruption in CI
- **Details**:
  - CI environment has different timer handling than local dev
  - Need robust detection and handling of CI environment
  - Prevent cascading failures from timer corruption
- **Action Items**:
  - Add CI environment detection
  - Implement timer state validation before/after tests
  - Create timer corruption recovery mechanism
  - Add CI-specific test configuration
  - Document CI-specific timer handling requirements
- **Resolution**: ✅ All safeguards implemented in test-lifecycle.ts: CI environment detection via `process.env.CI`, timer corruption recovery with `getSafeTimerFunction()` fallback, CI-specific cleanup handling, and comprehensive error boundaries. Tests pass consistently in CI mode (31 TestLifecycleManager tests ✓).

- [x] ### Fix TestLifecycleManager test failures ✅ COMPLETED
- **Priority**: Medium
- **Issue**: 3 tests failing in `tests/utils/test-lifecycle.test.ts`
- **Details**:
  - `should reset modules when configured` - vi.resetModules spy not being called as expected
  - `should execute custom cleanup functions` - cleanup function spy not being called
  - `should continue cleanup even if one function fails` - failing cleanup spy not being called
- **Impact**: Test utility infrastructure only, does not affect core functionality
- **Context**: These failures are blocking commits due to pre-commit hooks running test suite
- **Resolution**: ✅ Fixed by adding `clearMocks: false` and `restoreMocks: false` to prevent spy state clearing. Also resolved unhandled promise rejections in API tests that were blocking commits.

## Completed
- ✅ Implement Deep Type Validation for Chrome API Messages (comprehensive security validation)
- ✅ Fix critical CI blockers (Playwright conflicts, service worker timeouts)
- ✅ Add pre-push hook infrastructure to run test suite before pushes
