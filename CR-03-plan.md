# CR-03 Plan: Refactor tests to use mock Logger instead of console

## Analysis

After reviewing the codebase, particularly `src/shared/logger.ts` and `src/service-worker/index.test.ts`, I've identified the following issues:

1. The tests in `src/service-worker/index.test.ts` are directly mocking and restoring global `console` methods (lines 22-36, 64-65, 98-99)
2. The `expectLogToContain` helper in `src/service-worker/index.test.ts` (lines 106-113) doesn't actually validate log content - it just returns `expect(true).toBe(true)`
3. The `Logger` class in `src/shared/logger.ts` maintains internal references to console methods but doesn't allow for easy substitution in tests

According to the development philosophy, we should:
- Mock only at true external system boundaries
- Test what a component does via its public API, not how
- Default to immutability and avoid global state

## Implementation Approach

To address these issues, I'll:

1. **Refactor the Logger class to support testing**:
   - Add an optional `outputAdapter` parameter to the Logger constructor to allow for dependency injection of output methods
   - Create an interface for this adapter with methods matching console output functions
   - Default to using console methods when no adapter is provided

2. **Update test setup**:
   - Create a mock logger factory that returns Logger instances with mock output adapters
   - Add a mock implementation of the `createLogger` function that returns these instances
   - Set up these mocks in the `beforeEach` hook and reset them after each test
   - Remove direct console mocking

3. **Fix the log assertion helper**:
   - Rewrite `expectLogToContain` to inspect calls to the mocked logger methods
   - Add proper assertions that validate both log messages and structured data
   - Support matching strings or objects in log content

4. **Update existing tests**:
   - Ensure all tests are updated to use the new mocking approach
   - Fix all assertions that rely on console mocks
   - Maintain test coverage while making these changes

## Implementation Steps

1. **Refactor Logger class**:
   - Define a new `LoggerOutputAdapter` interface in `logger.ts`
   - Modify the Logger constructor to accept an optional outputAdapter parameter
   - Update the `output` method to use the adapter if provided, falling back to console methods

2. **Create test utilities**:
   - Implement a `createMockLogger` function in the test file that returns a mocked Logger instance
   - Create a mock implementation of `createLogger` that uses this function
   - Add spy functions to track calls to logger methods

3. **Rewrite the assertion helper**:
   - Replace the `expectLogToContain` function with an implementation that checks log output
   - Support string and object matching patterns
   - Make assertions against structured log data

4. **Update test setup and teardown**:
   - Replace console mocking with Logger mocking in `beforeEach` and `afterEach` hooks
   - Mock the `createLogger` function to return our test instances
   - Ensure proper restoration after tests

5. **Fix individual tests**:
   - Update all test cases to use the new logging assertions
   - Verify that all tests still pass with the new implementation

## Potential Risks and Mitigation

1. **Risk**: Breaking existing tests during refactoring
   **Mitigation**: Make incremental changes, run tests frequently, maintain test coverage

2. **Risk**: Difficulty mocking the singleton logger instance
   **Mitigation**: Use Vitest's module mocking capabilities to replace the entire logger module

3. **Risk**: Hidden dependencies on console mocking
   **Mitigation**: Carefully analyze test cases and update assertions as needed

## Success Criteria

1. All tests pass after the refactoring
2. Console mocking is completely removed from the tests
3. Logger instances are properly mocked and assertions validate structured log data
4. The skipped test "should return cached price when available" is re-enabled and passes
5. The implementation adheres to the project's development philosophy