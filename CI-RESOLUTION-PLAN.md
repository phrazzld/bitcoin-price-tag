# CI Resolution Plan

**Generated:** 2025-06-05T19:46:00Z  
**Based on:** [CI-FAILURE-SUMMARY.md](CI-FAILURE-SUMMARY.md)  
**Priority:** CRITICAL - Complete test pipeline failure

## Root Cause Summary

The CI pipeline is failing due to **Performance.now readonly property errors** in the test infrastructure. Node.js 18+ treats `Performance.now` as a readonly property, preventing direct assignment for mocking, which breaks timing-dependent tests across multiple test files.

## Resolution Strategy

### Phase 1: Immediate Fix (Estimated: 30-45 minutes)

#### 1.1 Identify Performance.now Mocking Locations
**Priority:** HIGH  
**Estimated Time:** 10 minutes

Search for and identify all locations where `Performance.now` is being mocked:

```bash
# Search for Performance.now mocking patterns
rg -i "performance\.now" --type ts
rg -i "performance\[.now.\]" --type ts
grep -r "Performance.now" tests/
grep -r "performance.now" src/
```

#### 1.2 Replace Direct Property Assignment
**Priority:** HIGH  
**Estimated Time:** 20-30 minutes

Replace direct property assignment with compatible mocking approaches:

**Current Pattern (Failing):**
```typescript
Performance.prototype.now = vi.fn(() => mockTime);
// or
performance.now = mockFunction;
```

**Replacement Patterns (Node.js 18+ Compatible):**
```typescript
// Option 1: Use Object.defineProperty
Object.defineProperty(performance, 'now', {
  value: vi.fn(() => mockTime),
  writable: true,
  configurable: true
});

// Option 2: Use vi.spyOn for Vitest
vi.spyOn(performance, 'now').mockReturnValue(mockTime);

// Option 3: Mock the entire performance object
vi.stubGlobal('performance', {
  ...performance,
  now: vi.fn(() => mockTime)
});
```

#### 1.3 Update Test Helper Utilities
**Priority:** HIGH  
**Estimated Time:** 10-15 minutes

**Primary Files to Update:**
- `tests/utils/dom-observer-helpers.ts:65:22` (primary location from error)
- `test/setup.ts` (global test configuration)
- Any test utilities in `tests/utils/` that handle timing

**Approach:**
1. Create a centralized timing mock utility
2. Replace all direct Performance.now assignments
3. Use consistent mocking pattern across all test files

### Phase 2: Validation and Testing (Estimated: 15-20 minutes)

#### 2.1 Local Test Validation
**Priority:** HIGH  
**Estimated Time:** 10 minutes

```bash
# Test the specific failing files
pnpm run test src/content-script/dom-observer-integration.test.ts
pnpm run test src/content-script/dom-observer-setup.test.ts

# Run full test suite to check for regressions
pnpm run test
```

#### 2.2 Node Version Compatibility Check
**Priority:** MEDIUM  
**Estimated Time:** 5-10 minutes

```bash
# Test with both Node versions if available locally
node --version  # Verify current version
pnpm run test  # Should work with the fixes
```

### Phase 3: CI Pipeline Verification (Estimated: 10 minutes)

#### 3.1 Push and Monitor
**Priority:** HIGH  
**Estimated Time:** 10 minutes

1. Commit the Performance.now mocking fixes
2. Push to trigger CI pipeline
3. Monitor test execution for:
   - Test (Node 18) job success
   - Test (Node 20) job success
   - No new test failures introduced

## Implementation Details

### Specific Files to Modify

1. **`tests/utils/dom-observer-helpers.ts`**
   - Line 65:22 (primary error location)
   - Replace direct Performance.now assignment

2. **`test/setup.ts`**
   - Add global Performance.now mock setup
   - Ensure compatibility across all test files

3. **Affected Test Files:**
   - `src/content-script/dom-observer-integration.test.ts`
   - `src/content-script/dom-observer-setup.test.ts`
   - Any other files using Performance.now mocking

### Recommended Mocking Pattern

```typescript
// Create a reusable timing mock utility
export function mockPerformanceNow(mockTime: number = 0) {
  return vi.spyOn(performance, 'now').mockReturnValue(mockTime);
}

export function mockPerformanceNowSequence(times: number[]) {
  const spy = vi.spyOn(performance, 'now');
  times.forEach((time, index) => {
    spy.mockReturnValueOnce(time);
  });
  return spy;
}
```

## Risk Assessment

### Low Risk
- **Scope:** Changes limited to test infrastructure
- **Approach:** Using established Vitest mocking patterns
- **Compatibility:** Node.js 18+ standard approach

### Mitigation Strategies
- **Backup:** Keep original test code in comments during transition
- **Incremental:** Fix one test file at a time and validate
- **Rollback:** Ready to revert if new issues emerge

## Success Criteria

### Immediate Success (Phase 1 & 2)
- [ ] All `Performance.now` mocking uses compatible patterns
- [ ] `dom-observer-integration.test.ts` tests pass locally
- [ ] `dom-observer-setup.test.ts` tests pass locally
- [ ] No new test failures introduced

### CI Pipeline Success (Phase 3)
- [ ] Test (Node 18) job passes
- [ ] Test (Node 20) job passes
- [ ] CI Success job passes
- [ ] No regression in other CI jobs

## Post-Resolution Tasks

1. **Documentation Update:** Update testing guidelines about readonly property mocking
2. **Review Process:** Add code review checklist item for Performance API mocking
3. **Best Practices:** Document the preferred mocking patterns for timing-related tests

## Expected Timeline

- **Total Estimated Time:** 55-85 minutes
- **Critical Path:** Performance.now mocking replacement (Phase 1.2)
- **Validation:** Local testing before CI push
- **Completion Target:** CI pipeline fully green