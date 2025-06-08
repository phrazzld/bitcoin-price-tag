# TODO

## High Priority

- [~] ### Fix CI timer state corruption in TestLifecycleManager
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

- [ ] ### Fix service worker test cleanup timeouts
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

- [ ] ### Fix test lifecycle manager timer validation
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

- [ ] ### Add CI-specific timer safeguards
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
