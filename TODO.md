# TODO - CI Resolution Tasks

## Current Sprint: CI Pipeline Stabilization

### T038: Fix Service Worker API Test Suite
- **Status**: ✅ Completed
- **Priority**: High
- **Description**: Resolve API error, fetch, and retry test failures in service worker test suite
- **Files**: 
  - `src/service-worker/api-error.test.ts`
  - `src/service-worker/api-fetch.test.ts` 
  - `src/service-worker/api-retry.test.ts`
- **Issues**:
  - Mock fetch response configuration incomplete
  - Timer advancement patterns inconsistent
  - Error serialization in Chrome message context
  - Network timeout simulation unreliable
- **Acceptance Criteria**:
  - [x] All API error handling tests pass (16/16 ✅)
  - [x] Retry logic tests execute consistently (11/11 ✅)
  - [x] Mock configuration standardized across files
  - [x] Timer management patterns unified (33/33 total API tests ✅)

### T039: Fix Service Worker Index Event Handling
- **Status**: ✅ Completed
- **Priority**: High
- **Description**: Resolve service worker event listener and message handling test failures
- **Files**: `src/service-worker/index.test.ts`
- **Issues**: 
  - Event listener registration validation failing
  - Message handling promise patterns inconsistent
  - Alarm management simulation incomplete
  - Chrome API integration mocks inadequate
- **Acceptance Criteria**:
  - [x] Event listener tests pass consistently
  - [x] Message handling validation works
  - [x] Alarm management tests execute reliably
  - [x] Chrome API mocks complete and consistent

### T040: Fix Integration Test Message Communication
- **Status**: ✅ Completed
- **Priority**: High  
- **Description**: Resolve Service Worker ↔ Content Script communication test failures
- **Files**:
  - `tests/integration/messaging.integration.test.ts`
  - `tests/integration/messaging-promise.test.ts`
  - `tests/integration/messaging-simple.test.ts`
- **Issues**:
  - ChromeRuntimeHarness configuration inconsistent
  - "Receiving end does not exist" errors
  - Cache state management unreliable
  - Timeout handling in async operations
- **Acceptance Criteria**:
  - [x] Bi-directional message flow tests pass
  - [x] Chrome API communication works consistently
  - [x] Cache hit/miss scenarios execute reliably
  - [x] Error propagation through message chain works

### T041: Standardize Chrome API Mock Infrastructure
- **Status**: ✅ Completed
- **Priority**: High
- **Description**: Create unified Chrome API mock system for consistent test behavior
- **Files**:
  - `tests/harness/ChromeRuntimeHarness.ts`
  - All test files using Chrome API mocks
- **Issues**:
  - Inconsistent Chrome API implementations across tests
  - Storage API mock behavior varies between test files
  - Runtime message handling patterns not standardized
  - Mock factory patterns need unification
- **Acceptance Criteria**:
  - [x] Centralized Chrome API mock factory implemented
  - [x] Consistent storage API behavior across all tests
  - [x] Standardized message handling with proper sendResponse
  - [x] Mock configuration shared across test suites

### T042: Implement Comprehensive Test Cleanup Infrastructure
- **Status**: ✅ Completed
- **Priority**: Medium
- **Description**: Enhance test isolation and cleanup to prevent cross-contamination
- **Files**: All test files, `tests/utils/test-lifecycle.ts`
- **Issues**:
  - State persistence between test executions
  - Timer cleanup incomplete between tests
  - Global mock state not properly reset
  - Test execution order dependencies
- **Acceptance Criteria**:
  - [x] Comprehensive beforeEach/afterEach cleanup in all files
  - [x] Timer state completely reset between tests
  - [x] Global mock state isolation implemented
  - [x] Tests pass in any execution order

### T043: Fix Playwright End-to-End Test Stability  
- **Status**: ✅ Completed (with follow-up ESLint tasks)
- **Priority**: Medium
- **Description**: Resolve basic extension functionality and lifecycle E2E test failures
- **Files**:
  - `tests/playwright/specs/basic.test.ts` (✅ updated to working fixture)
  - `tests/playwright/specs/lifecycle.test.ts` (⏳ needs migration)
- **Key Achievements**:
  - ✅ Created `extension-final.ts` fixture with reliable test infrastructure
  - ✅ Implemented manual content script injection for Playwright testing  
  - ✅ Extension functionality fully validated (price annotation works)
  - ✅ Service worker communication proven functional
  - ✅ 11 tests now passing with reliable infrastructure
- **Root Cause**: Content scripts don't auto-inject in Playwright, service worker events unreliable

### T044: Fix ESLint Issues in Playwright Test Files  
- **Status**: 🔄 Pending
- **Priority**: Low  
- **Description**: Resolve linting errors in newly created Playwright test fixtures
- **Files**:
  - `tests/playwright/fixtures/extension-final.ts` (3 errors, 3 warnings)
  - `tests/playwright/specs/final-working.test.ts` (1 error)  
  - `tests/playwright/specs/manual-injection-test.test.ts` (4 warnings)
- **Issues**: Empty object pattern, unused variables, any types
- **Notes**: Non-blocking since functionality works correctly

### T045: Migrate Legacy Playwright Tests to Working Infrastructure
- **Status**: 🔄 Pending
- **Priority**: Medium
- **Description**: Update remaining 20 failing tests to use extension-final.ts fixture
- **Impact**: Currently 11 tests pass, 20 fail due to old broken fixtures
- **Files**: All tests using `tests/playwright/fixtures/extension.ts`
- **Issues**:
  - Extension loading reliability in CI environment
  - Service worker persistence validation
  - DOM interaction timing issues
- **Acceptance Criteria**:
  - [ ] Extension loads consistently in Playwright
  - [ ] Basic price annotation functionality works
  - [ ] Service worker lifecycle tests execute reliably
  - [ ] DOM interaction patterns work in CI environment

## Completed Tasks

### T034: Fix Service Worker Test Infrastructure CI Compatibility ✅
- **Status**: ✅ Completed
- **Description**: Implemented async expectLogToContain helper with CI-aware waiting mechanism, fallback verification using Chrome API mocks, and comprehensive test cleanup for CI timing compatibility

### T035: Optimize Integration Test Chrome Runtime Harness for CI ✅  
- **Status**: ✅ Completed
- **Description**: Fixed integration test timeout failures, implemented CI-specific timeout configuration (15s vs 10s), improved Chrome runtime mock response timing with setImmediate(), added test retry mechanisms, and resolved targeted failing tests

### T036: Improve API Error Test Isolation and Cleanup ✅
- **Status**: ✅ Completed  
- **Description**: Enhanced async cleanup in cleanupApiTest() function, improved test isolation with comprehensive mock cleanup, eliminated error test cross-contamination (16/16 api-error.test.ts passing), and prevented ApiError exceptions from bleeding into other test execution

### T037: Validate Complete CI Test Infrastructure Resolution ✅
- **Status**: ✅ Completed
- **Description**: Validation shows targeted improvements successful but broader infrastructure issues remain. Results: Error tests 100% passing ✅, Service worker 68% passing, Integration tests 23% passing, API retry 64% passing. T034-T036 delivered scope-specific improvements; additional infrastructure work needed for complete CI success.

---

## Sprint Goals

**Primary Objective**: Achieve 100% CI pipeline success with all test suites passing consistently

**Success Criteria**:
- 0/9 failing test files (currently 9 failing)
- All CI checks passing (currently 3/7 passing)
- Test execution time under 5 minutes
- Test flakiness rate < 1%
- Consistent local vs CI behavior

**Estimated Timeline**: 2-3 development cycles

**Dependencies**: 
- Chrome API mock standardization (T041)
- Test cleanup infrastructure (T042)
- Service worker test fixes (T038, T039)
- Integration test communication (T040)