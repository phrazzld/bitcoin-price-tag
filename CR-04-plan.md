# CR-04 Plan: Standardize Timer Mocking Strategy Across Tests

## Task Classification: Simple

This is a simple task focused on standardizing how timer mocking is handled across test files, primarily ensuring consistent usage patterns and improving test reliability.

## Current State

From analyzing the codebase, I've identified several inconsistent approaches to timer mocking:

1. **api.test.ts**:
   - Uses `vi.useFakeTimers()` and `vi.useRealTimers()` in `beforeEach` and `afterEach` hooks for some describe blocks
   - Uses direct `vi.spyOn(global, 'setTimeout')` mocking for some tests
   - Uses `vi.advanceTimersByTimeAsync()` for waiting in some tests
   - Uses `vi.runAllTimersAsync()` in others

2. **index.test.ts**:
   - Sets up fake timers in `beforeEach` and restores in `afterEach`
   - Uses `vi.runAllTimersAsync()` for waiting

3. **messaging.integration.test.ts**:
   - Directly mocks `setTimeout` for specific tests without using Vitest's timer utilities

4. **combined.test.ts**:
   - Uses real timers with manual `setTimeout` waits (this is a Playwright test that should use real timers)

## Completed Changes

1. **api.test.ts**: 
   - ✅ Standardized setup/teardown with `vi.useFakeTimers()` and `vi.useRealTimers()`
   - ✅ Removed redundant timer setup in nested describe blocks 
   - ✅ Replaced direct `setTimeout` mocking with controlled timer advancement
   - ✅ Enhanced test patterns to use `vi.advanceTimersByTimeAsync()` and `vi.runAllTimersAsync()`
   - ✅ Improved comments to explain timer usage patterns

2. **messaging-promise.test.ts**:
   - ✅ Added `vi.useFakeTimers()` in `beforeEach` and `vi.useRealTimers()` in `afterEach`
   - ✅ Updated test to use `vi.advanceTimersByTimeAsync()` to trigger async responses

3. **Partial work on messaging.integration.test.ts**:
   - ✅ Added `vi.useFakeTimers()` in `beforeEach` and `vi.useRealTimers()` in `afterEach`
   - ✅ Replaced direct `setTimeout` mock with proper timer advancement
   - ✅ Updated async tests to use `vi.runAllTimersAsync()`
   - ❓ Several tests still timing out - requires more complex fixes beyond the scope of this task

## Remaining Issues

1. **Complex integration tests in messaging.integration.test.ts**:
   - Multiple test timeouts that need more extensive restructuring 
   - May require significant refactoring of test cases and harness logic

## Principles Applied

- Used `vi.useFakeTimers()` and `vi.useRealTimers()` in setup/teardown hooks consistently
- Replaced direct mocking with Vitest's timer APIs
- Used `vi.advanceTimersByTimeAsync()` for controlled waiting
- Used `vi.runAllTimersAsync()` for running all pending timers
- Ensured proper timer restoration with teardown hooks

## Next Steps

While we've standardized the approach to timer mocking across most tests, a more comprehensive refactoring of the integration tests would be required to fully resolve all test timing issues. This should be addressed in a separate task.

The core principles for standardized timer mocking are now established:

1. Always use `vi.useFakeTimers()` in beforeEach and `vi.useRealTimers()` in afterEach
2. Avoid direct mocking of timer functions
3. Use `vi.advanceTimersByTimeAsync()` for specific delays
4. Use `vi.runAllTimersAsync()` for running all pending timers