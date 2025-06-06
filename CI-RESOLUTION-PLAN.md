# CI Failure Resolution Plan

**Target:** Fix 9 failing test files and achieve 100% CI success  
**Priority:** High (blocking PR merge)  
**Estimated Effort:** 2-3 development cycles

## Resolution Strategy Overview

This plan addresses CI failures through systematic improvements to test infrastructure, mock configurations, and async handling patterns. The approach prioritizes high-impact fixes that resolve multiple related failures.

## Phase 1: Core Infrastructure Fixes (High Priority)

### 1.1 Chrome API Mock Standardization
**Target Files:** All integration tests, service worker tests  
**Problem:** Inconsistent Chrome API implementations causing communication failures

**Actions:**
- Standardize `ChromeRuntimeHarness` across all test environments
- Implement complete Chrome storage API mock with proper async behavior
- Add comprehensive Chrome runtime message handling with proper sendResponse patterns
- Create centralized Chrome API mock factory for consistent behavior

**Success Criteria:**
- All integration tests pass Chrome API communication
- Service worker message handling works consistently
- No "Receiving end does not exist" errors

### 1.2 Timer and Async Operation Management
**Target Files:** `api-retry.test.ts`, `messaging.integration.test.ts`  
**Problem:** Race conditions and improper timer handling in async operations

**Actions:**
- Implement comprehensive timer utilities with CI-aware delays
- Add proper async/await patterns for all timer-dependent operations
- Create helper functions for timer advancement in retry scenarios
- Ensure proper cleanup of all pending timers between tests

**Success Criteria:**
- API retry tests pass consistently with proper timing
- No timer leakage between test executions
- Async operations complete reliably in CI environment

### 1.3 Test Isolation and Cleanup Enhancement
**Target Files:** All test files  
**Problem:** Cross-contamination between tests causing flaky behavior

**Actions:**
- Implement comprehensive `beforeEach`/`afterEach` cleanup in all test files
- Add global state reset utilities for complete test isolation
- Create mock factory reset patterns to prevent state persistence
- Implement test execution order independence validation

**Success Criteria:**
- Tests pass in any execution order
- No state persistence between test files
- Consistent behavior in both local and CI environments

## Phase 2: Service Worker Test Fixes (High Priority)

### 2.1 API Error Handling Improvements
**Target File:** `src/service-worker/api-error.test.ts`

**Specific Issues:**
- HTTP error response mock configuration
- JSON parsing error simulation
- Network error handling patterns
- Error serialization in Chrome message context

**Resolution:**
- Enhance mock fetch responses with complete Headers and Response interface
- Improve error object serialization for Chrome messaging
- Add proper async error handling patterns
- Implement comprehensive error validation scenarios

### 2.2 API Retry Logic Stabilization  
**Target File:** `src/service-worker/api-retry.test.ts`

**Specific Issues:**
- Exponential backoff timer advancement
- Network timeout simulation
- Retry exhaustion scenarios
- Progressive delay validation

**Resolution:**
- Implement robust timer advancement helpers for retry scenarios
- Add proper network timeout simulation with realistic delays
- Enhance retry exhaustion testing with comprehensive cleanup
- Create deterministic delay validation patterns

### 2.3 Service Worker Index Test Fixes
**Target File:** `src/service-worker/index.test.ts`

**Specific Issues:**
- Event listener registration validation
- Message handling in service worker context
- Alarm management and persistence
- Chrome API integration points

**Resolution:**
- Implement complete service worker event simulation
- Add proper Chrome API event handling mocks
- Enhance alarm management testing with realistic timing
- Create comprehensive service worker lifecycle testing

## Phase 3: Integration Test Resolution (Medium Priority)

### 3.1 Messaging Integration Stabilization
**Target File:** `tests/integration/messaging.integration.test.ts`

**Specific Issues:**
- Service Worker ↔ Content Script communication
- Cache hit/miss scenarios
- Storage error handling
- Timeout management

**Resolution:**
- Implement complete bi-directional message flow testing
- Add robust cache state management with proper TTL handling
- Enhance storage error simulation and recovery testing
- Create deterministic timeout scenarios with proper cleanup

### 3.2 Promise-Based Messaging Fixes
**Target File:** `tests/integration/messaging-promise.test.ts`

**Specific Issues:**
- Promise resolution timing
- Error propagation through message chain
- Async operation coordination

**Resolution:**
- Implement proper promise chain testing with deterministic timing
- Add comprehensive error propagation validation
- Enhance async operation coordination with proper sequencing

### 3.3 Simple Messaging Validation
**Target File:** `tests/integration/messaging-simple.test.ts`

**Specific Issues:**
- Basic message format validation
- Response structure verification
- Error handling patterns

**Resolution:**
- Implement complete message validation scenarios
- Add comprehensive response structure testing
- Enhance error handling pattern validation

## Phase 4: End-to-End Test Fixes (Lower Priority)

### 4.1 Basic Functionality Testing
**Target File:** `tests/playwright/specs/basic.test.ts`

**Actions:**
- Ensure extension loading works reliably
- Validate DOM interaction patterns
- Test price annotation functionality

### 4.2 Lifecycle Management Testing  
**Target File:** `tests/playwright/specs/lifecycle.test.ts`

**Actions:**
- Test service worker persistence
- Validate extension state management
- Ensure proper cleanup on page navigation

## Implementation Timeline

### Week 1: Infrastructure (Phase 1)
- Day 1-2: Chrome API mock standardization
- Day 3-4: Timer and async management improvements
- Day 5: Test isolation enhancement and validation

### Week 2: Service Worker Tests (Phase 2)
- Day 1-2: API error handling and retry logic fixes
- Day 3-4: Service worker index test resolution
- Day 5: Integration testing and validation

### Week 3: Integration & E2E (Phases 3-4)
- Day 1-3: Integration test fixes
- Day 4-5: End-to-end test resolution and final validation

## Risk Mitigation

### High Risk Areas
- **Chrome API Compatibility:** Test against multiple Chrome API versions
- **Timing Dependencies:** Implement robust timing patterns with fallbacks
- **CI Environment Differences:** Add CI-specific debugging and logging

### Contingency Plans
- **Fallback Implementations:** Provide alternative mock strategies for flaky components
- **Incremental Rollout:** Fix and validate test files individually before batch integration
- **Monitoring Enhancement:** Add comprehensive test execution logging for debugging

## Success Metrics

### Primary Goals
- ✅ 0/9 failing test files (100% success rate)
- ✅ All CI checks passing consistently
- ✅ Test execution time under 5 minutes total

### Secondary Goals
- ✅ Test flakiness rate < 1%
- ✅ Consistent local vs CI behavior
- ✅ Comprehensive test coverage maintained

## Validation Process

### Per-Phase Validation
1. Run affected test files individually
2. Run complete test suite for regression detection
3. Execute CI pipeline validation
4. Monitor for 24-48 hours for stability

### Final Validation
1. Complete CI pipeline success on multiple commits
2. Parallel test execution validation
3. Cross-platform compatibility verification (if applicable)
4. Performance impact assessment

---

*This resolution plan provides a systematic approach to addressing all identified CI failures with clear priorities, timelines, and success criteria.*