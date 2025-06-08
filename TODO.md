# TODO

## High Priority

### Fix TestLifecycleManager test failures
- **Priority**: Medium
- **Issue**: 3 tests failing in `tests/utils/test-lifecycle.test.ts`
- **Details**: 
  - `should reset modules when configured` - vi.resetModules spy not being called as expected
  - `should execute custom cleanup functions` - cleanup function spy not being called
  - `should continue cleanup even if one function fails` - failing cleanup spy not being called
- **Impact**: Test utility infrastructure only, does not affect core functionality
- **Context**: These failures are blocking commits due to pre-commit hooks running test suite
- **Resolution**: Debug TestLifecycleManager spy setup and method invocation timing

## Completed
- ✅ Implement Deep Type Validation for Chrome API Messages (comprehensive security validation)
- ✅ Fix critical CI blockers (Playwright conflicts, service worker timeouts)
- ✅ Add pre-push hook infrastructure to run test suite before pushes